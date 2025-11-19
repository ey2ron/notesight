import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import JSZip from "jszip";
import Soundfont from "soundfont-player";
import "./XMLPlayer.css";

// Expose JSZip globally so OSMD can unpack compressed .mxl scores.
if (typeof window !== "undefined" && !window.JSZip) {
  window.JSZip = JSZip;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const INSTRUMENT_OPTIONS = [
  { label: "🎹 Piano", value: "acoustic_grand_piano" },
  { label: "🎻 Violin", value: "violin" },
  { label: "🎶 Flute", value: "flute" },
  { label: "🎸 Guitar", value: "acoustic_guitar_nylon" },
  { label: "🎷 Saxophone", value: "soprano_sax" },
  { label: "🦴 Trombone", value: "trombone" },
  { label: "🎻 Cello", value: "cello" }
];

const MIN_BPM = 30;
const MAX_BPM = 240;

export function XMLPlayerPage() {
  const [bpm, setBpm] = useState(120);
  const [instrumentName, setInstrumentName] = useState("acoustic_grand_piano");

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

      const beatsPerSecond = bpm / 60;
      const baseDuration = beatsPerSecond ? 1 / beatsPerSecond : 0.5;
      const lengthFraction = meta.length;
      const noteBeats = lengthFraction && typeof lengthFraction.RealValue === "number" ? lengthFraction.RealValue : 1;
      const durationSeconds = Math.max(0.2, baseDuration * noteBeats);
      const context = audioContextRef.current;
      const startTime = (context ? context.currentTime : 0) + 0.01;

      midiValues.forEach((midi) => {
        const noteName = midiToNoteName(midi);
        instrument.play(noteName, startTime, { duration: durationSeconds });
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
        // eslint-disable-next-line no-console
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
            if (!graphicalNote || !graphicalNote.sourceNote || graphicalNote.sourceNote.isRest()) {
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
                  typeof graphicalNote.sourceNote.getAbsoluteTimestamp === "function"
                    ? graphicalNote.sourceNote.getAbsoluteTimestamp()
                    : null,
                length: graphicalNote.sourceNote.Length || null,
                measureElement: findMeasureElementFromNode(noteElement)
              };
              noteElementDataRef.current.set(noteElement, meta);
            }

            meta.midis.add(graphicalNote.sourceNote.halfTone + 12);
            if (!meta.length && graphicalNote.sourceNote.Length) {
              meta.length = graphicalNote.sourceNote.Length;
            }
            if (!meta.timestamp && typeof graphicalNote.sourceNote.getAbsoluteTimestamp === "function") {
              meta.timestamp = graphicalNote.sourceNote.getAbsoluteTimestamp();
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

      stopPlayback();
      noteElementDataRef.current = new WeakMap();

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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.error("Failed to load MusicXML", err);
        alert(`Unable to load MusicXML: ${message}`);
        return false;
      }

      attachNoteClickHandlers();
      stopPlayback();
      lastCursorIndexRef.current = 0;
      return true;
    },
    [attachNoteClickHandlers, readMusicXmlFromMxl, stopPlayback]
  );

  const handleFileChange = useCallback(
    async (event) => {
      const inputElement = event.target;
      const file = inputElement.files?.[0];
      if (!file) {
        return;
      }

      await loadScoreFile(file);
      inputElement.value = "";
    },
    [loadScoreFile]
  );

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
      if (!playingRef.current || cursor.iterator.endReached) {
        stopPlayback();
        return;
      }

      const durationMs = 60000 / bpm;
      const durationSeconds = durationMs / 1000;

      clearMeasureHighlight();
      const measureIndex = cursor.iterator.CurrentMeasureIndex;
      const container = containerRef.current;
      if (container) {
        const svgMeasure = container.querySelector(`g[id^='measure'][id$='-${measureIndex}']`);
        if (svgMeasure) {
          svgMeasure.classList.add("highlight-measure");
        }
      }

      const voices = cursor.iterator.CurrentVoiceEntries || [];
      for (const voice of voices) {
        for (const note of voice.Notes || []) {
          if (!note.isRest()) {
            const midi = note.halfTone + 12;
            const noteName = midiToNoteName(midi);
            instrument.play(noteName, audioContextRef.current.currentTime, { duration: durationSeconds });
          }
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
      }, durationMs);
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
    return () => {
      containerRef.current?.querySelectorAll("[data-note-click-bound]").forEach((el) => {
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
