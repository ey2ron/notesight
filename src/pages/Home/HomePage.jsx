import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay"
import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import "./HomePage.css"

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "")

function useMidiPlayerScript() {
  useEffect(() => {
    if (document.querySelector("script[data-midi-player]") || typeof window === "undefined") {
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/html-midi-player@1.6.4/dist/html-midi-player.js"
    script.async = true
    script.dataset.midiPlayer = "true"
    document.body.append(script)
  }, [])
}

function formatDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleString()
  } catch (error) {
    return "--"
  }
}

function humanStatus(score) {
  if (!score) return ""
  if (score.status === "ready") return "Ready"
  if (score.status === "error") return "Failed"
  if (score.status === "processing") return "Processing"
  if (score.status === "queued") return "Queued"
  return score.status ?? "Unknown"
}

function parseError(error) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return error instanceof Error ? error.message : "Unexpected error"
}

export function HomePage() {
  const [scores, setScores] = useState([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedScoreId, setSelectedScoreId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [events, setEvents] = useState([])

  const viewerRef = useRef(null)
  const osmdRef = useRef(null)

  useMidiPlayerScript()

  const selectedScore = useMemo(
    () => scores.find((score) => String(score.id) === String(selectedScoreId)) ?? null,
    [scores, selectedScoreId],
  )

  const fetchScores = useCallback(async () => {
    try {
      setLoadingScores(true)
      const response = await axios.get(`${API_BASE}/api/scores`)
      setScores(response.data)
    } catch (error) {
      setFeedback({ type: "error", message: parseError(error) })
    } finally {
      setLoadingScores(false)
    }
  }, [])

  const fetchEvents = useCallback(
    async (id) => {
      if (!id) {
        setEvents([])
        return
      }
      try {
        const response = await axios.get(`${API_BASE}/api/scores/${id}/events`)
        setEvents(response.data)
      } catch (error) {
        setEvents([])
        setFeedback({ type: "error", message: parseError(error) })
      }
    },
    [],
  )

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  useEffect(() => {
    if (!selectedScoreId) {
      setEvents([])
      return
    }
    fetchEvents(selectedScoreId)
    const interval = setInterval(() => fetchEvents(selectedScoreId), 7000)
    return () => clearInterval(interval)
  }, [selectedScoreId, fetchEvents])

  useEffect(() => {
    if (!scores.some((score) => ["queued", "processing"].includes(score.status))) {
      return
    }
    const interval = setInterval(fetchScores, 4000)
    return () => clearInterval(interval)
  }, [scores, fetchScores])

  useEffect(() => {
    if (!selectedScore || selectedScore.status !== "ready" || !viewerRef.current) {
      return
    }

    const loadScore = async () => {
      try {
        if (!osmdRef.current) {
          osmdRef.current = new OpenSheetMusicDisplay(viewerRef.current, {
            drawingParameters: "compacttight",
            drawTitle: true,
          })
        } else {
          osmdRef.current.clear()
        }
        await osmdRef.current.load(`${API_BASE}/files/${selectedScore.musicxml_path}`)
        osmdRef.current.render()
      } catch (error) {
        setFeedback({ type: "error", message: parseError(error) })
      }
    }

    loadScore()
  }, [selectedScore])

  useEffect(() => {
    if (!selectedScore || selectedScore.status !== "ready") {
      osmdRef.current?.clear()
    }
  }, [selectedScore])

  const handleUpload = async (event) => {
    event.preventDefault()
    setFeedback(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const name = formData.get("name")?.toString().trim()
    const file = formData.get("file")

    if (!name) {
      setFeedback({ type: "error", message: "Please provide a name for the score." })
      return
    }
    if (!(file instanceof File) || file.size === 0) {
      setFeedback({ type: "error", message: "Please choose an image to digitize." })
      return
    }

    try {
      setUploading(true)
      const response = await axios.post(`${API_BASE}/api/scores`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setScores((prev) => {
        const filtered = prev.filter((score) => score.id !== response.data.id)
        return [response.data, ...filtered]
      })
      setSelectedScoreId(response.data.id)
      form.reset()
      setFeedback({ type: "success", message: "Upload started. Processing will begin shortly." })
    } catch (error) {
      setFeedback({ type: "error", message: parseError(error) })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (scoreId) => {
    if (!window.confirm("Delete this score?")) {
      return
    }
    try {
      await axios.delete(`${API_BASE}/api/scores/${scoreId}`)
      setScores((prev) => prev.filter((score) => score.id !== scoreId))
      if (String(scoreId) === String(selectedScoreId)) {
        setSelectedScoreId(null)
      }
      setFeedback({ type: "success", message: "Score deleted." })
    } catch (error) {
      setFeedback({ type: "error", message: parseError(error) })
    }
  }

  return (
    <>
      <SidebarToggle />
      <div className="home-container">
        <header className="home-header">
          <h1>Notesight Workspace</h1>
          <p>Upload sheet music images to digitize them into MusicXML and MIDI.</p>
        </header>

        {feedback ? (
          <div className={`feedback feedback-${feedback.type}`}>
            {feedback.message}
          </div>
        ) : null}

        <section className="upload-panel">
          <h2>Upload New Score</h2>
          <form className="upload-form" onSubmit={handleUpload} encType="multipart/form-data">
            <label className="field">
              <span>Score name</span>
              <input type="text" name="name" placeholder="Eg. Clair de Lune" required disabled={uploading} />
            </label>
            <label className="field">
              <span>Sheet music image</span>
              <input type="file" name="file" accept="image/*" required disabled={uploading} />
            </label>
            <button className="primary" type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload & digitize"}
            </button>
          </form>
        </section>

        <section className="main-grid">
          <aside className="score-gallery">
            <div className="section-header">
              <h2>Library</h2>
              <button className="refresh" type="button" onClick={fetchScores} disabled={loadingScores}>
                {loadingScores ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <ul className="score-list">
              {scores.length === 0 ? <li className="empty">No scores yet.</li> : null}
              {scores.map((score) => {
                const isSelected = String(score.id) === String(selectedScoreId)
                return (
                  <li
                    key={score.id}
                    className={`score-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedScoreId(score.id)}
                  >
                    <header>
                      <h3>{score.name}</h3>
                      <span className={`status status-${score.status}`}>{humanStatus(score)}</span>
                    </header>
                    <p className="meta">Created {formatDate(score.created_at)}</p>
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${Math.min(score.progress, 100)}%` }} />
                    </div>
                    <footer>
                      <span>{Math.round(score.progress)}%</span>
                      <button
                        type="button"
                        className="danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDelete(score.id)
                        }}
                      >
                        Delete
                      </button>
                    </footer>
                    {score.status === "error" && score.error ? (
                      <p className="error-detail">{score.error}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </aside>

          <div className="score-detail">
            {!selectedScore ? (
              <div className="placeholder">Select a score to preview and download.</div>
            ) : (
              <div className="detail-card">
                <header>
                  <h2>{selectedScore.name}</h2>
                  <span className={`status status-${selectedScore.status}`}>{humanStatus(selectedScore)}</span>
                </header>
                <div className="summary">
                  <p>Uploaded: {formatDate(selectedScore.created_at)}</p>
                  <p>Updated: {formatDate(selectedScore.updated_at)}</p>
                </div>

                {selectedScore.status === "ready" ? (
                  <div className="downloads">
                    <a className="primary" href={`${API_BASE}/files/${selectedScore.musicxml_path}`} download>
                      Download MusicXML
                    </a>
                    <a className="secondary" href={`${API_BASE}/files/${selectedScore.midi_path}`} download>
                      Download MIDI
                    </a>
                  </div>
                ) : null}

                <div className="viewer" ref={viewerRef} aria-label="Sheet music viewer" />

                {selectedScore.status === "ready" ? (
                  <div className="midi-player">
                    <midi-player
                      src={`${API_BASE}/files/${selectedScore.midi_path}`}
                      sound-font
                      visualizer="#midi-visualizer"
                    />
                    <midi-visualizer type="piano-roll" id="midi-visualizer" />
                  </div>
                ) : (
                  <p className="processing-note">Digitized files become available once processing finishes.</p>
                )}

                {events.length > 0 ? (
                  <div className="event-log">
                    <h3>Activity</h3>
                    <ul>
                      {events.map((event) => (
                        <li key={event.id}>
                          <span className="event-time">{formatDate(event.created_at)}</span>
                          <span className={`event-kind event-${event.kind}`}>{event.kind}</span>
                          <span className="event-message">{event.payload?.message ?? ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
