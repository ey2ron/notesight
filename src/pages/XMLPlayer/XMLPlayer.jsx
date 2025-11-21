import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import JSZip from "jszip";
import Soundfont from "soundfont-player";
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { toast } from "react-toastify";
import { auth, db, storage } from "../Auth/firebase.jsx";
import "./XMLPlayer.css";

// Expose JSZip globally so OSMD can unpack compressed .mxl scores.
if (typeof window !== "undefined" && !window.JSZip) {
  window.JSZip = JSZip;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const INSTRUMENT_OPTIONS = [
  { label: "Piano", value: "acoustic_grand_piano" },
  { label: "Violin", value: "violin" },
  { label: "Flute", value: "flute" },
  { label: "Guitar", value: "acoustic_guitar_nylon" },
  { label: "Saxophone", value: "soprano_sax" },
  { label: "Trombone", value: "trombone" },
  { label: "Cello", value: "cello" }
];

const MIN_BPM = 30;
const MAX_BPM = 360;
const DEFAULT_SCORE_FILENAME = "audiveris-output.mxl";
const ILLEGAL_STORAGE_CHARS = new Set(["#", "[", "]", "*", "?", "\\", "/"]);
const MAX_INLINE_SCORE_BYTES = 700 * 1024; // keep inline payloads well below Firestore 1MB limit
const THUMBNAIL_MAX_WIDTH = 320;
const THUMBNAIL_BACKGROUND = "#ffffff";
const GHOST_NOTE_GAIN = 0.35;

function fractionToNumber(fraction) {
  if (!fraction) {
    return null;
  }

  if (typeof fraction.RealValue === "number") {
    return fraction.RealValue;
  }

  const numerator =
    typeof fraction.Numerator === "number"
      ? fraction.Numerator
      : typeof fraction.numerator === "number"
        ? fraction.numerator
        : null;
  const denominator =
    typeof fraction.Denominator === "number"
      ? fraction.Denominator
      : typeof fraction.denominator === "number"
        ? fraction.denominator
        : null;

  if (numerator !== null && denominator !== null && denominator !== 0) {
    return numerator / denominator;
  }

  if (typeof fraction.value === "number") {
    return fraction.value;
  }
  if (typeof fraction.Value === "number") {
    return fraction.Value;
  }
  if (typeof fraction.toRealValue === "function") {
    try {
      const value = fraction.toRealValue();
      return typeof value === "number" && !Number.isNaN(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  return null;
}

function beatsToSeconds(beats, bpmValue) {
  if (typeof bpmValue !== "number" || bpmValue <= 0) {
    return 0;
  }
  if (typeof beats !== "number" || Number.isNaN(beats) || beats <= 0) {
    return 0;
  }
  return (60 / bpmValue) * (beats * 1.75);
}

function arrayBufferToBase64(buffer) {
  if (!buffer) {
    return "";
  }
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    return "";
  }
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  const globalScope = typeof globalThis !== "undefined" ? globalThis : {};
  if (typeof globalScope.btoa === "function") {
    return globalScope.btoa(binary);
  }
  if (globalScope.Buffer) {
    return globalScope.Buffer.from(binary, "binary").toString("base64");
  }

  throw new Error("No base64 encoder available in this environment");
}

function sanitizeFileName(name) {
  const fallback = DEFAULT_SCORE_FILENAME;
  if (typeof name !== "string") {
    return fallback;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return fallback;
  }
  let sanitized = "";
  for (const char of trimmed) {
    const code = char.charCodeAt(0);
    if (code < 32 || ILLEGAL_STORAGE_CHARS.has(char)) {
      sanitized += "_";
    } else {
      sanitized += char;
    }
  }
  return sanitized;
}

function isSourceNoteRest(note) {
  return Boolean(note) && typeof note.isRest === "function" && note.isRest();
}

function hasNoteheadLikeData(note) {
  if (!note) {
    return false;
  }

  try {
    const notehead = note.Notehead;
    return Boolean(notehead && typeof notehead === "object");
  } catch (error) {
    return false;
  }
}

function getHalfToneValue(note) {
  if (!note) {
    return null;
  }

  if (typeof note.halfTone === "number" && Number.isFinite(note.halfTone)) {
    return note.halfTone;
  }

  try {
    const pitch = note.Pitch;
    if (pitch && typeof pitch.getHalfTone === "function") {
      const pitchHalfTone = pitch.getHalfTone();
      if (Number.isFinite(pitchHalfTone)) {
        return pitchHalfTone;
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function isGhostSourceNote(note) {
  if (!isSourceNoteRest(note)) {
    return false;
  }
  return hasNoteheadLikeData(note) || getHalfToneValue(note) !== null;
}

function fractionToBeats(fraction) {
  const numeric = fractionToNumber(fraction);
  if (numeric === null) {
    return null;
  }
  return numeric * 4;
}

export function XMLPlayerPage() {
  const [bpm, setBpm] = useState(190);
  const [instrumentName, setInstrumentName] = useState("acoustic_grand_piano");
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [hasLoadedScore, setHasLoadedScore] = useState(false);
  const [isAlreadyInLibrary, setIsAlreadyInLibrary] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const osmdRef = useRef(null);
  const audioContextRef = useRef(null);
  const instrumentRef = useRef(null);
  const loadedInstrumentNameRef = useRef("");
  const lastCursorIndexRef = useRef(0);
  const playTimerRef = useRef(null);
  const playingRef = useRef(false);
  const currentScoreRef = useRef({ file: null, name: "", extension: "", mimeType: "" });
  const noteElementDataRef = useRef(new WeakMap());

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const midiToNoteName = useCallback((midi) => {
    const octave = Math.floor(midi / 12) - 1;
    const noteName = NOTE_NAMES[midi % 12];
    return `${noteName}${octave}`;
  }, []);

  const clearMeasureHighlight = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll(".highlight-measure").forEach((el) => {
      el.classList.remove("highlight-measure");
    });
  }, []);

  const stopPlayback = useCallback(
    ({ preserveCursorPosition = false, keepHighlight = false } = {}) => {
      playingRef.current = false;
      if (playTimerRef.current !== null) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }

      if (!keepHighlight) {
        clearMeasureHighlight();
      }

      const osmd = osmdRef.current;
      if (osmd && osmd.cursor) {
        osmd.cursor.hide();
        if (!preserveCursorPosition) {
          osmd.cursor.reset();
          lastCursorIndexRef.current = 0;
        }
      }
    },
    [clearMeasureHighlight]
  );

  const ensureAudioContextRunning = useCallback(async () => {
    const context = audioContextRef.current;
    if (context && context.state === "suspended") {
      await context.resume();
    }
  }, []);

  const ensureInstrumentReady = useCallback(async () => {
    const context = audioContextRef.current;
    if (!context) {
      return null;
    }

    if (!instrumentRef.current || loadedInstrumentNameRef.current !== instrumentName) {
      instrumentRef.current = await Soundfont.instrument(context, instrumentName);
      loadedInstrumentNameRef.current = instrumentName;
    }

    return instrumentRef.current;
  }, [instrumentName]);

  const findMeasureElementFromNode = useCallback((node) => {
    let current = node;
    while (current) {
      if (current.id && current.id.startsWith("measure")) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }, []);

  const moveCursorToTimestamp = useCallback((targetTimestamp) => {
    const osmd = osmdRef.current;
    if (!osmd || !osmd.cursor || !targetTimestamp) {
      return;
    }

    const cursor = osmd.cursor;
    cursor.show();
    cursor.reset();

    let steps = 0;
    while (!cursor.iterator.endReached && cursor.iterator.CurrentTime.lt(targetTimestamp)) {
      cursor.next();
      steps += 1;
    }
    lastCursorIndexRef.current = steps;
  }, []);

  const handleNoteClick = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const osmd = osmdRef.current;
      if (!osmd) {
        return;
      }

      stopPlayback({ preserveCursorPosition: true });
      await ensureAudioContextRunning();
      const instrument = await ensureInstrumentReady();
      if (!instrument) {
        return;
      }

      const noteElement = event.currentTarget;
      const meta = noteElementDataRef.current.get(noteElement);
      if (!meta) {
        return;
      }

      const midiValues = meta.midis ? Array.from(meta.midis) : [];
      if (midiValues.length === 0) {
        return;
      }

      clearMeasureHighlight();
      const measureElement = meta.measureElement || findMeasureElementFromNode(noteElement);
      if (measureElement) {
        measureElement.classList.add("highlight-measure");
      }

      if (meta.timestamp) {
        const timestampClone = typeof meta.timestamp.clone === "function" ? meta.timestamp.clone() : meta.timestamp;
        moveCursorToTimestamp(timestampClone);
      }

      const lengthFraction = meta.length;
      const noteBeats = fractionToBeats(lengthFraction) || 1;
      const durationSeconds = Math.max(0.1, beatsToSeconds(noteBeats, bpm));
      const context = audioContextRef.current;
      const startTime = (context ? context.currentTime : 0) + 0.01;

      midiValues.forEach((midi) => {
        const noteName = midiToNoteName(midi);
        const playOptions = { duration: durationSeconds };
        if (meta.isGhost) {
          playOptions.gain = GHOST_NOTE_GAIN;
        }
        instrument.play(noteName, startTime, playOptions);
      });
    },
    [bpm, clearMeasureHighlight, ensureAudioContextRunning, ensureInstrumentReady, findMeasureElementFromNode, midiToNoteName, moveCursorToTimestamp, stopPlayback]
  );

  const readMusicXmlFromMxl = useCallback(async (arrayBuffer) => {
    const zip = await JSZip.loadAsync(arrayBuffer);

    const resolveRootFile = async () => {
      const containerEntry = zip.file("META-INF/container.xml");
      if (!containerEntry) {
        return null;
      }

      try {
        const containerXml = await containerEntry.async("string");
        const parser = new DOMParser();
        const doc = parser.parseFromString(containerXml, "application/xml");
        const rootfileEl = doc.querySelector("rootfile");
        const fullPath = rootfileEl?.getAttribute("full-path");
        if (fullPath) {
          return zip.file(fullPath);
        }
      } catch (error) {
        console.warn("Failed to parse META-INF/container.xml", error);
      }

      return null;
    };

    let xmlEntry = await resolveRootFile();

    if (!xmlEntry) {
      const fallbackCandidates = zip
        .file(/\.(musicxml|xml)$/i)
        .filter((entry) => !entry.name.toLowerCase().startsWith("meta-inf/"));
      if (fallbackCandidates.length > 0) {
        xmlEntry = fallbackCandidates[0];
      }
    }

    if (!xmlEntry) {
      throw new Error("No MusicXML document found inside the .mxl archive.");
    }

    return xmlEntry.async("string");
  }, []);

  const attachNoteClickHandlers = useCallback(() => {
    noteElementDataRef.current = new WeakMap();
    const osmd = osmdRef.current;
    if (!osmd || !osmd.GraphicSheet) {
      return;
    }

    const verticalContainers = osmd.GraphicSheet.VerticalGraphicalStaffEntryContainers || [];
    for (const container of verticalContainers) {
      if (!container?.StaffEntries) continue;
      for (const staffEntry of container.StaffEntries) {
        if (!staffEntry?.graphicalVoiceEntries) continue;
        for (const voiceEntry of staffEntry.graphicalVoiceEntries) {
          if (!voiceEntry?.notes) continue;
          for (const graphicalNote of voiceEntry.notes) {
            const sourceNote = graphicalNote?.sourceNote;
            if (!graphicalNote || !sourceNote) {
              continue;
            }

            const restLike = isSourceNoteRest(sourceNote);
            const ghostNote = restLike && isGhostSourceNote(sourceNote);
            if (restLike && !ghostNote) {
              continue;
            }

            const halfTone = getHalfToneValue(sourceNote);
            if (halfTone === null) {
              continue;
            }

            const vexflowData = graphicalNote.vfnote;
            const vfNote = Array.isArray(vexflowData) ? vexflowData[0] : undefined;
            if (!vfNote?.attrs?.el) {
              continue;
            }

            const noteElement = vfNote.attrs.el;
            let meta = noteElementDataRef.current.get(noteElement);
            if (!meta) {
              meta = {
                midis: new Set(),
                timestamp:
                  typeof sourceNote.getAbsoluteTimestamp === "function"
                    ? sourceNote.getAbsoluteTimestamp()
                    : null,
                length: sourceNote.Length || null,
                measureElement: findMeasureElementFromNode(noteElement),
                isGhost: ghostNote
              };
              noteElementDataRef.current.set(noteElement, meta);
            } else if (ghostNote) {
              meta.isGhost = true;
            }

            meta.midis.add(halfTone + 12);
            if (!meta.length && sourceNote.Length) {
              meta.length = sourceNote.Length;
            }
            if (!meta.timestamp && typeof sourceNote.getAbsoluteTimestamp === "function") {
              meta.timestamp = sourceNote.getAbsoluteTimestamp();
            }
            if (!meta.measureElement) {
              meta.measureElement = findMeasureElementFromNode(noteElement);
            }

            if (!noteElement.dataset.noteClickBound) {
              noteElement.dataset.noteClickBound = "1";
              noteElement.style.cursor = "pointer";
              noteElement.addEventListener("click", handleNoteClick, { passive: false });
            }
          }
        }
      }
    }
  }, [findMeasureElementFromNode, handleNoteClick]);

  const captureScoreThumbnail = useCallback(async () => {
    if (typeof window === "undefined") {
      return "";
    }

    const container = containerRef.current;
    if (!container) {
      return "";
    }

    const svgElement = container.querySelector("svg");
    if (!svgElement) {
      return "";
    }

    try {
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      if (!svgString.includes("xmlns=")) {
        svgString = svgString.replace(
          /^<svg/,
          '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"',
        );
      }

      const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(svgBlob);

      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Unable to load score preview"));
          img.src = svgUrl;
        });

        const targetWidth = Math.min(THUMBNAIL_MAX_WIDTH, image.width || THUMBNAIL_MAX_WIDTH);
        const scale = image.width ? targetWidth / image.width : 1;
        const width = Math.max(1, Math.round(image.width * scale)) || THUMBNAIL_MAX_WIDTH;
        const height = Math.max(1, Math.round(image.height * scale)) || Math.round(targetWidth * 1.3);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          return "";
        }
        context.fillStyle = THUMBNAIL_BACKGROUND;
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        return canvas.toDataURL("image/jpeg", 0.82);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      console.warn("Failed to capture score thumbnail", error);
      return "";
    }
  }, []);

  const checkIfScoreExists = useCallback(async (rawName) => {
    const user = auth.currentUser;
    if (!user) {
      setIsAlreadyInLibrary(false);
      setIsCheckingLibrary(false);
      return false;
    }

    const sanitizedName = sanitizeFileName(rawName || DEFAULT_SCORE_FILENAME);
    setIsCheckingLibrary(true);

    try {
      const libraryCollection = collection(db, "users", user.uid, "library");
      const libraryQuery = query(libraryCollection, where("fileName", "==", sanitizedName));
      const snapshot = await getDocs(libraryQuery);
      const exists = !snapshot.empty;
      setIsAlreadyInLibrary(exists);
      return exists;
    } catch (error) {
      console.error("Failed to check existing scores", error);
      setIsAlreadyInLibrary(false);
      return false;
    } finally {
      setIsCheckingLibrary(false);
    }
  }, []);

  const loadScoreFile = useCallback(
    async (file) => {
      if (!file || !containerRef.current) {
        return false;
      }

      const fileName = (file.name || "").toLowerCase();
      const isCompressedMusicXml = fileName.endsWith(".mxl");
      const isPlainMusicXml = fileName.endsWith(".musicxml") || fileName.endsWith(".xml");

      if (!isCompressedMusicXml && !isPlainMusicXml) {
        alert("Unsupported file format. Please choose a .musicxml, .xml, or .mxl file.");
        return false;
      }

      setHasLoadedScore(false);
      currentScoreRef.current = { file: null, name: "", extension: "", mimeType: "" };
      stopPlayback();
      noteElementDataRef.current = new WeakMap();
      setIsAlreadyInLibrary(false);
      setIsCheckingLibrary(false);

      let musicXmlContent = "";
      try {
        if (isCompressedMusicXml) {
          const arrayBuffer = await file.arrayBuffer();
          musicXmlContent = await readMusicXmlFromMxl(arrayBuffer);
        } else {
          musicXmlContent = await file.text();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to unpack MusicXML", err);
        alert(`Unable to read MusicXML: ${message}`);
        return false;
      }

      if (!osmdRef.current) {
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          drawTitle: true,
          drawPartNames: true,
          drawFingerings: true,
          drawMeasureNumbers: true,
          drawSubtitle: true,
          followCursor: true
        });
      } else {
        osmdRef.current.clear();
      }

      try {
        await osmdRef.current.load(musicXmlContent);
        osmdRef.current.render();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to load MusicXML", err);
        alert(`Unable to load MusicXML: ${message}`);
        return false;
      }

      const resolvedName = file.name && file.name.trim() ? file.name : DEFAULT_SCORE_FILENAME;
      const resolvedExtension = resolvedName.includes(".")
        ? (resolvedName.split(".").pop() || "").toLowerCase()
        : "";
      currentScoreRef.current = {
        file,
        name: resolvedName,
        extension: resolvedExtension,
        mimeType: file.type || "",
      };
      attachNoteClickHandlers();
      stopPlayback();
      lastCursorIndexRef.current = 0;
      await checkIfScoreExists(resolvedName);
      setHasLoadedScore(true);
      return true;
    },
    [attachNoteClickHandlers, checkIfScoreExists, readMusicXmlFromMxl, stopPlayback]
  );

  const handleAddToLibrary = useCallback(async () => {
    if (isSavingToLibrary) {
      return;
    }

    if (isAlreadyInLibrary) {
      toast.info("This score is already in your library.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in to save scores to your library.");
      return;
    }

    const scoreMeta = currentScoreRef.current;
    if (!scoreMeta?.file) {
      toast.error("Load a score before adding it to your library.");
      return;
    }

    setIsSavingToLibrary(true);

    try {
      const originalName = scoreMeta.name && scoreMeta.name.trim() ? scoreMeta.name : scoreMeta.file.name;
      const sanitizedName = sanitizeFileName(originalName || DEFAULT_SCORE_FILENAME);
      if (await checkIfScoreExists(sanitizedName)) {
        toast.info("This score is already in your library.");
        return;
      }
      const extension = (scoreMeta.extension || sanitizedName.split(".").pop() || "mxl").toUpperCase();
      const baseTitle = sanitizedName.replace(/\.[^/.]+$/, "") || "Untitled Score";
      const storagePath = `users/${user.uid}/library/${Date.now()}-${sanitizedName}`;
      const fileRef = storageRef(storage, storagePath);

      let inlineScoreData = "";
      if (scoreMeta.file.size <= MAX_INLINE_SCORE_BYTES) {
        try {
          const arrayBuffer = await scoreMeta.file.arrayBuffer();
          inlineScoreData = arrayBufferToBase64(arrayBuffer);
        } catch (encodeError) {
          console.warn("Failed to encode inline score payload", encodeError);
        }
      }

      await uploadBytes(fileRef, scoreMeta.file, {
        contentType: scoreMeta.mimeType || scoreMeta.file.type || "application/octet-stream",
      });
      const downloadURL = await getDownloadURL(fileRef);
      const thumbnailData = await captureScoreThumbnail();
      const libraryCollection = collection(db, "users", user.uid, "library");
      const docRef = doc(libraryCollection);
      const now = serverTimestamp();
      const payload = {
        title: baseTitle,
        fileName: sanitizedName,
        fileExtension: extension,
        storagePath,
        downloadURL,
        isFavorite: false,
        scoreSize: scoreMeta.file.size,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };

      if (inlineScoreData) {
        payload.scoreData = inlineScoreData;
        payload.scoreMimeType = scoreMeta.mimeType || scoreMeta.file.type || "application/octet-stream";
      }

      if (thumbnailData) {
        payload.thumbnailData = thumbnailData;
      }

      await setDoc(docRef, payload);
      toast.success("Score added to your library.");
      setIsAlreadyInLibrary(true);
    } catch (error) {
      console.error("Failed to add score to library", error);
      toast.error("Could not add this score to your library.");
    } finally {
      setIsSavingToLibrary(false);
    }
  }, [captureScoreThumbnail, checkIfScoreExists, currentScoreRef, isAlreadyInLibrary, isSavingToLibrary]);

  const handlePlay = useCallback(async () => {
    const osmd = osmdRef.current;
    if (!osmd || !osmd.cursor) {
      alert("No music loaded yet.");
      return;
    }

    await ensureAudioContextRunning();
    const instrument = await ensureInstrumentReady();
    if (!instrument) {
      return;
    }

    stopPlayback({ preserveCursorPosition: true, keepHighlight: true });

    const cursor = osmd.cursor;
    cursor.show();
    cursor.reset();
    for (let i = 0; i < lastCursorIndexRef.current; i += 1) {
      cursor.next();
    }

    playingRef.current = true;

    const playStep = () => {
      const iterator = cursor.iterator;
      if (!playingRef.current || !iterator || iterator.endReached) {
        stopPlayback();
        return;
      }

      const voices = iterator.CurrentVoiceEntries || [];

      const getShortestNoteBeats = () => {
        let shortest = null;
        for (const voiceEntry of voices) {
          for (const note of voiceEntry.Notes || []) {
            const restLike = isSourceNoteRest(note);
            const ghostNote = restLike && isGhostSourceNote(note);
            if (restLike && !ghostNote) {
              continue;
            }
            const noteBeats = fractionToBeats(note.Length);
            if (typeof noteBeats === "number" && noteBeats > 0 && (shortest === null || noteBeats < shortest)) {
              shortest = noteBeats;
            }
          }
        }
        return shortest;
      };

      const getStepBeats = () => {
        const currentTimeValue = fractionToBeats(iterator.CurrentSourceTimestamp);
        let nextTimeValue = null;

        if (typeof iterator.clone === "function") {
          try {
            const clone = iterator.clone();
            if (clone && typeof clone.moveToNext === "function") {
              clone.moveToNext();
              nextTimeValue = fractionToBeats(clone.CurrentSourceTimestamp);
            }
          } catch (error) {
            // fallback handled below
          }
        }

        if (currentTimeValue !== null && nextTimeValue !== null) {
          const delta = nextTimeValue - currentTimeValue;
          if (delta > 0) {
            return delta;
          }
        }

        const shortest = getShortestNoteBeats();
        if (shortest !== null && shortest > 0) {
          return shortest;
        }

        return 1;
      };

      const stepBeats = getStepBeats();
      const stepDurationSeconds = Math.max(0.05, beatsToSeconds(stepBeats, bpm));
      const nextDelayMs = Math.max(1, Math.round(stepDurationSeconds * 1000));

      clearMeasureHighlight();
      const measureIndex = iterator.CurrentMeasureIndex;
      const container = containerRef.current;
      if (container) {
        const svgMeasure = container.querySelector(`g[id^='measure'][id$='-${measureIndex}']`);
        if (svgMeasure) {
          svgMeasure.classList.add("highlight-measure");
        }
      }

      for (const voice of voices) {
        for (const note of voice.Notes || []) {
          const restLike = isSourceNoteRest(note);
          const ghostNote = restLike && isGhostSourceNote(note);
          if (restLike && !ghostNote) {
            continue;
          }

          const halfTone = getHalfToneValue(note);
          if (halfTone === null) {
            continue;
          }

          const midi = halfTone + 12;
          const noteName = midiToNoteName(midi);
          const noteBeats = fractionToBeats(note.Length) || stepBeats;
          const noteDurationSeconds = Math.max(0.05, beatsToSeconds(noteBeats, bpm));
          const playOptions = { duration: noteDurationSeconds };
          if (ghostNote) {
            playOptions.gain = GHOST_NOTE_GAIN;
          }
          const context = audioContextRef.current;
          const startTime = context ? context.currentTime : undefined;
          instrument.play(noteName, startTime, playOptions);
        }
      }

      playTimerRef.current = window.setTimeout(() => {
        playTimerRef.current = null;
        if (!playingRef.current || !osmd.cursor) {
          return;
        }
        cursor.next();
        lastCursorIndexRef.current += 1;
        playStep();
      }, nextDelayMs);
    };

    playStep();
  }, [bpm, clearMeasureHighlight, ensureAudioContextRunning, ensureInstrumentReady, midiToNoteName, stopPlayback]);

  const handleStop = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  const handleInstrumentChange = useCallback((event) => {
    setInstrumentName(event.target.value);
    instrumentRef.current = null;
    loadedInstrumentNameRef.current = "";
  }, []);

  const handleBpmChange = useCallback((event) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      setBpm(value);
    }
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  useEffect(() => {
    const containerEl = containerRef.current;
    return () => {
      containerEl?.querySelectorAll("[data-note-click-bound]").forEach((el) => {
        el.removeEventListener("click", handleNoteClick);
        delete el.dataset.noteClickBound;
      });
    };
  }, [handleNoteClick]);

  useEffect(() => {
    const navState = location.state;
    if (!navState || !navState.scoreBlob) {
      return;
    }

    let cancelled = false;

    const openFromNavigation = async () => {
      try {
        const blob = navState.scoreBlob;
        const providedName = typeof navState.fileName === "string" && navState.fileName.trim() ? navState.fileName : "audiveris-output.mxl";
        const lowerName = providedName.toLowerCase();
        const inferredType = blob?.type || (lowerName.endsWith(".mxl") ? "application/vnd.recordare.musicxml+xml" : "application/xml");
        const file = new File([blob], providedName, { type: inferredType });
        await loadScoreFile(file);
      } finally {
        if (!cancelled) {
          navigate(location.pathname, { replace: true, state: null });
        }
      }
    };

    openFromNavigation();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.state, loadScoreFile, navigate]);

  const addToLibraryDisabled =
    !hasLoadedScore || isSavingToLibrary || isAlreadyInLibrary || isCheckingLibrary;
  const addButtonLabel = isAlreadyInLibrary
    ? "Already in Library"
    : isSavingToLibrary
      ? "Saving..."
      : isCheckingLibrary
        ? "Checking..."
        : "Add to Library";

  return (
    <div className="xmlplayer">
      <header className="xmlplayer__header">
        <button type="button" className="xmlplayer__back" onClick={handleBack}>
          ← Back
        </button>
      </header>

      <main className="xmlplayer__stage">
        <div className="xmlplayer__sheet" ref={containerRef} />
      </main>

      <nav className="xmlplayer__controls" aria-label="Playback controls">
        <div className="xmlplayer__controls-group">
          <label className="xmlplayer__field">
            <span className="xmlplayer__field-label">Instrument</span>
            <select value={instrumentName} onChange={handleInstrumentChange}>
              {INSTRUMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="xmlplayer__field xmlplayer__field--slider">
            <span className="xmlplayer__field-label">Speed: {bpm} BPM</span>
            <input type="range" min={MIN_BPM} max={MAX_BPM} step={1} value={bpm} onChange={handleBpmChange} />
          </label>
        </div>

        <div className="xmlplayer__buttons">
          <button
            type="button"
            className="xmlplayer__button xmlplayer__button--library"
            onClick={handleAddToLibrary}
            disabled={addToLibraryDisabled}
          >
            {addButtonLabel}
          </button>
          <button type="button" className="xmlplayer__button xmlplayer__button--play" onClick={handlePlay}>
            ▶️ Play
          </button>
          <button type="button" className="xmlplayer__button xmlplayer__button--stop" onClick={handleStop}>
            ⏹ Stop
          </button>
        </div>
      </nav>
    </div>
  );
}

export default XMLPlayerPage;
