import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import { OMRUpload } from "../../components/OMRUpload"
import { FavoritesPanel } from "../../components/Home/FavoritesPanel"
import { LibraryPanel } from "../../components/Home/LibraryPanel"
import "./HomePage.css"
import HomeBg from "../Landing/assets/BG.png"
import { auth, db, storage } from "../Auth/firebase.jsx"
import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { deleteObject, getBlob, getDownloadURL, ref } from "firebase/storage"
import { toast } from "react-toastify"

const FILE_VISUALS = {
  MXL: { thumbColor: "#F7EAFE", previewVariant: "music", previewGlyph: "🎵" },
  MUSICXML: { thumbColor: "#F7EAFE", previewVariant: "music", previewGlyph: "🎵" },
  XML: { thumbColor: "#F7EAFE", previewVariant: "music", previewGlyph: "🎵" },
  PDF: { thumbColor: "#E9F0FF", previewVariant: "pdf", previewGlyph: "📄" },
  PNG: { thumbColor: "#E6F3ED", previewVariant: "image", previewGlyph: "🖼️" },
  JPG: { thumbColor: "#FFF2E1", previewVariant: "image", previewGlyph: "🖼️" },
  JPEG: { thumbColor: "#FFF2E1", previewVariant: "image", previewGlyph: "🖼️" },
}

const DEFAULT_VISUALS = { thumbColor: "#DFE4EA", previewVariant: "generic", previewGlyph: "📄" }
const BASE64_CHUNK_SIZE = 0x8000

function decodeBase64ToBlob(base64, mimeType) {
  if (!base64) {
    return null
  }

  let binaryString
  try {
    const globalScope = typeof globalThis !== "undefined" ? globalThis : {}
    if (typeof globalScope.atob === "function") {
      binaryString = globalScope.atob(base64)
    } else if (globalScope.Buffer) {
      binaryString = globalScope.Buffer.from(base64, "base64").toString("binary")
    } else {
      return null
    }
  } catch (error) {
    console.warn("Failed to decode base64 score payload", error)
    return null
  }

  const byteArrays = []
  for (let offset = 0; offset < binaryString.length; offset += BASE64_CHUNK_SIZE) {
    const slice = binaryString.slice(offset, offset + BASE64_CHUNK_SIZE)
    const byteNumbers = new Array(slice.length)
    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index)
    }
    byteArrays.push(new Uint8Array(byteNumbers))
  }

  try {
    return new Blob(byteArrays, { type: mimeType || "application/octet-stream" })
  } catch (blobError) {
    console.warn("Failed to construct blob from inline score data", blobError)
    return null
  }
}

function formatTimestamp(value) {
  if (!value) {
    return ""
  }
  const date = value.toDate ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function decorateLibraryItem(snapshot) {
  const data = snapshot.data() ?? {}
  const explicitExtension = (data.fileExtension || data.type || "").toString().toUpperCase()
  const fallbackExtension = data.fileName ? data.fileName.split(".").pop()?.toUpperCase() : ""
  const extension = explicitExtension || fallbackExtension || "MXL"
  const visuals = FILE_VISUALS[extension] ?? DEFAULT_VISUALS
  const lastOpenedSource = data.lastOpenedAt ?? data.updatedAt ?? data.createdAt ?? null

  return {
    id: snapshot.id,
    title: data.title?.trim() || data.fileName || "Untitled Score",
    fileName: data.fileName || "",
    storagePath: data.storagePath || "",
    downloadURL: data.downloadURL || "",
    scoreData: data.scoreData || "",
    scoreMimeType: data.scoreMimeType || "",
    scoreSize: data.scoreSize || 0,
    thumbnailData: data.thumbnailData || "",
    isFavorite: Boolean(data.isFavorite),
    type: extension,
    thumbColor: visuals.thumbColor,
    previewVariant: visuals.previewVariant,
    previewGlyph: visuals.previewGlyph,
    lastOpened: formatTimestamp(lastOpenedSource),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastOpenedAt: data.lastOpenedAt ?? null,
  }
}

export function HomePage() {
  const fileInputId = "home-omr-file"
  const [activePanel, setActivePanel] = useState("favorites")
  const [libraryItems, setLibraryItems] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isLibraryLoading, setIsLibraryLoading] = useState(true)
  const [openingItemId, setOpeningItemId] = useState(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameDraft, setRenameDraft] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!currentUser) {
      setLibraryItems([])
      setIsLibraryLoading(false)
      return undefined
    }

    setIsLibraryLoading(true)
    const libraryRef = collection(db, "users", currentUser.uid, "library")
    const libraryQuery = query(libraryRef, orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(
      libraryQuery,
      (snapshot) => {
        const nextItems = snapshot.docs.map(decorateLibraryItem)
        setLibraryItems(nextItems)
        setIsLibraryLoading(false)
      },
      (error) => {
        console.error("Failed to load library", error)
        toast.error("Could not load your library.")
        setLibraryItems([])
        setIsLibraryLoading(false)
      },
    )

    return unsubscribe
  }, [currentUser])

  const handleSectionChange = useCallback((section) => {
    setActivePanel(section)
  }, [])

  const favoriteItems = useMemo(
    () => libraryItems.filter((item) => item.isFavorite),
    [libraryItems],
  )

  const favoriteIds = useMemo(
    () => favoriteItems.map((item) => item.id),
    [favoriteItems],
  )

  const closeRenameDialog = useCallback(() => {
    setRenameTarget(null)
    setRenameDraft("")
    setIsRenaming(false)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteTarget(null)
    setIsDeleting(false)
  }, [])

  const handleRenameRequest = useCallback(
    (itemId) => {
      if (!currentUser) {
        toast.error("Sign in to manage your library.")
        return
      }

      const target = libraryItems.find((item) => item.id === itemId)
      if (!target) {
        toast.error("Could not find this score.")
        return
      }

      setRenameTarget(target)
      setRenameDraft(target.title)
    },
    [currentUser, libraryItems],
  )

  const handleRenameSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.()

      if (!currentUser) {
        toast.error("Sign in to manage your library.")
        return
      }

      if (!renameTarget) {
        return
      }

      const trimmed = renameDraft.trim()
      if (!trimmed) {
        toast.error("Name cannot be empty.")
        return
      }

      if (trimmed === renameTarget.title) {
        closeRenameDialog()
        return
      }

      try {
        setIsRenaming(true)
        const docRef = doc(db, "users", currentUser.uid, "library", renameTarget.id)
        await updateDoc(docRef, { title: trimmed, updatedAt: serverTimestamp() })
        toast.success("Score renamed.")
        closeRenameDialog()
      } catch (error) {
        console.error("Failed to rename score", error)
        toast.error("Could not rename score.")
      } finally {
        setIsRenaming(false)
      }
    },
    [closeRenameDialog, currentUser, renameDraft, renameTarget],
  )

  const handleDeleteRequest = useCallback(
    (itemId) => {
      if (!currentUser) {
        toast.error("Sign in to manage your library.")
        return
      }

      const target = libraryItems.find((item) => item.id === itemId)
      if (!target) {
        toast.error("Could not find this score.")
        return
      }

      setDeleteTarget(target)
    },
    [currentUser, libraryItems],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!currentUser || !deleteTarget) {
      if (!currentUser) {
        toast.error("Sign in to manage your library.")
      }
      return
    }

    setIsDeleting(true)

    try {
      const docRef = doc(db, "users", currentUser.uid, "library", deleteTarget.id)
      await deleteDoc(docRef)

      if (deleteTarget.storagePath) {
        const fileRef = ref(storage, deleteTarget.storagePath)
        await deleteObject(fileRef).catch((error) => {
          console.warn("Unable to delete storage object", error)
        })
      }

      toast.success("Score removed.")
      closeDeleteDialog()
    } catch (error) {
      console.error("Failed to delete score", error)
      toast.error("Could not delete score.")
    } finally {
      setIsDeleting(false)
    }
  }, [closeDeleteDialog, currentUser, deleteTarget])

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return
      }

      if (renameTarget && !isRenaming) {
        closeRenameDialog()
      } else if (deleteTarget && !isDeleting) {
        closeDeleteDialog()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeDeleteDialog, closeRenameDialog, deleteTarget, isDeleting, isRenaming, renameTarget])

  const handleFavorite = useCallback(
    async (itemId) => {
      if (!currentUser) {
        toast.error("Sign in to manage favorites.")
        return
      }

      try {
        const docRef = doc(db, "users", currentUser.uid, "library", itemId)
        await updateDoc(docRef, { isFavorite: true, updatedAt: serverTimestamp() })
      } catch (error) {
        console.error("Failed to favorite score", error)
        toast.error("Could not update favorites.")
      }
    },
    [currentUser],
  )

  const handleUnfavorite = useCallback(
    async (itemId) => {
      if (!currentUser) {
        toast.error("Sign in to manage favorites.")
        return
      }

      try {
        const docRef = doc(db, "users", currentUser.uid, "library", itemId)
        await updateDoc(docRef, { isFavorite: false, updatedAt: serverTimestamp() })
      } catch (error) {
        console.error("Failed to unfavorite score", error)
        toast.error("Could not update favorites.")
      }
    },
    [currentUser],
  )

  const handleOpenScore = useCallback(
    async (item) => {
      if (!currentUser) {
        toast.error("Sign in to access your library.")
        return
      }

      if (!item?.id) {
        return
      }

      if (!item.downloadURL && !item.storagePath) {
        toast.error("This score is missing its file. Try converting again.")
        return
      }

      setOpeningItemId(item.id)

      try {
        let blob = null

        if (item.scoreData) {
          blob = decodeBase64ToBlob(item.scoreData, item.scoreMimeType)
        }

        if (item.storagePath) {
          const fileRef = ref(storage, item.storagePath)
          if (!blob) {
            try {
              blob = await getBlob(fileRef)
            } catch (storageError) {
              console.warn("Storage blob fetch failed, retrying with download URL", storageError)
            }
          }

          if (!blob) {
            try {
              const freshUrl = await getDownloadURL(fileRef)
              const response = await fetch(freshUrl)
              if (!response.ok) {
                throw new Error(`Unable to fetch score (${response.status})`)
              }
              blob = await response.blob()
            } catch (downloadError) {
              if (item.downloadURL) {
                const hasHttpScheme = /^https?:/i.test(item.downloadURL)
                const directUrl = hasHttpScheme ? item.downloadURL : null
                if (directUrl) {
                  try {
                    const response = await fetch(directUrl)
                    if (!response.ok) {
                      throw new Error(`Unable to fetch score (${response.status})`)
                    }
                    blob = await response.blob()
                  } catch (directError) {
                    console.warn("Direct URL fetch failed, refreshing token", directError)
                    const refreshedUrl = await getDownloadURL(ref(storage, item.downloadURL))
                    const retryResponse = await fetch(refreshedUrl)
                    if (!retryResponse.ok) {
                      throw new Error(`Unable to fetch score (${retryResponse.status})`)
                    }
                    blob = await retryResponse.blob()
                  }
                } else {
                  const urlFromPointer = await getDownloadURL(ref(storage, item.downloadURL))
                  const fetchResponse = await fetch(urlFromPointer)
                  if (!fetchResponse.ok) {
                    throw new Error(`Unable to fetch score (${fetchResponse.status})`)
                  }
                  blob = await fetchResponse.blob()
                }
              } else {
                throw downloadError
              }
            }
          }
        } else if (item.downloadURL && !blob) {
          const hasHttpScheme = /^https?:/i.test(item.downloadURL)
          const directUrl = hasHttpScheme ? item.downloadURL : null
          if (directUrl) {
            try {
              const response = await fetch(directUrl)
              if (!response.ok) {
                throw new Error(`Unable to fetch score (${response.status})`)
              }
              blob = await response.blob()
            } catch (directError) {
              console.warn("Direct URL fetch failed, refreshing token", directError)
              const refreshedUrl = await getDownloadURL(ref(storage, item.downloadURL))
              const retryResponse = await fetch(refreshedUrl)
              if (!retryResponse.ok) {
                throw new Error(`Unable to fetch score (${retryResponse.status})`)
              }
              blob = await retryResponse.blob()
            }
          } else {
            const inferredRef = ref(storage, item.downloadURL)
            const downloadUrl = await getDownloadURL(inferredRef)
            const response = await fetch(downloadUrl)
            if (!response.ok) {
              throw new Error(`Unable to fetch score (${response.status})`)
            }
            blob = await response.blob()
          }
        }

        if (!blob) {
          throw new Error("Failed to retrieve MusicXML blob")
        }

        const inferredName = item.fileName && item.fileName.trim() ? item.fileName : `${item.title || "audiveris-output"}.mxl`

        navigate("/xmlplayer", {
          state: {
            scoreBlob: blob,
            fileName: inferredName,
          },
        })

        const docRef = doc(db, "users", currentUser.uid, "library", item.id)
        await updateDoc(docRef, { lastOpenedAt: serverTimestamp() }).catch(() => {})
      } catch (error) {
        console.error("Failed to open score", error)
        toast.error("Could not open this score.")
      } finally {
        setOpeningItemId(null)
      }
    },
    [currentUser, navigate],
  )

  const isAuthenticated = Boolean(currentUser)

  const libraryEmptyMessage = !isAuthenticated
    ? "Sign in to start building your library."
    : isLibraryLoading
      ? "Loading your library..."
      : "Your library is empty. Convert a score first to populate this space."

  const favoritesEmptyMessage = !isAuthenticated
    ? "Sign in to save favorites."
    : isLibraryLoading
      ? "Loading your favorites..."
      : "No favorites yet. Save a conversion to see it here."

  return (
    <>
      <SidebarToggle onSelectSection={handleSectionChange} />
      <div className="home-layout">
        <div className="home-brand">NoteSight</div>
        <div className="home-omr-inline">
          <div className="home-omr-surface">
            <div className="home-omr-overlay" />
            <OMRUpload layout="embedded" inputId={fileInputId} backgroundImage={HomeBg} />
          </div>
        </div>

        <div className="home-hero" style={{ backgroundImage: `url(${HomeBg})` }}>
          <div className="home-overlay" />
          <div className="home-hero-body">
            {activePanel === "library" ? (
              <LibraryPanel
                items={libraryItems}
                favorites={favoriteIds}
                onFavorite={handleFavorite}
                onUnfavorite={handleUnfavorite}
                onRename={handleRenameRequest}
                onDelete={handleDeleteRequest}
                emptyMessage={libraryEmptyMessage}
                onOpen={handleOpenScore}
                openingItemId={openingItemId}
              />
            ) : (
              <FavoritesPanel
                items={favoriteItems}
                onUnfavorite={handleUnfavorite}
                onRename={handleRenameRequest}
                onDelete={handleDeleteRequest}
                emptyMessage={favoritesEmptyMessage}
                onOpen={handleOpenScore}
                openingItemId={openingItemId}
              />
            )}
          </div>
        </div>
      </div>
      {renameTarget && (
        <div className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-rename-title">
          <div className="library-dialog__backdrop" onClick={closeRenameDialog} />
          <div
            className="library-dialog__panel"
            role="document"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="library-dialog__title" id="library-rename-title">
              Rename score
            </h3>
            <p className="library-dialog__description">
              Update the name that appears in your library.
            </p>
            <form className="library-dialog__form" onSubmit={handleRenameSubmit}>
              <label className="library-dialog__field">
                <span className="library-dialog__label">Score name</span>
                <input
                  type="text"
                  className="library-dialog__input"
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  placeholder="Enter a score name"
                  autoFocus
                />
              </label>
              <div className="library-dialog__actions">
                <button
                  type="button"
                  className="library-dialog__button"
                  onClick={closeRenameDialog}
                  disabled={isRenaming}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="library-dialog__button library-dialog__button--primary"
                  disabled={
                    isRenaming || !renameDraft.trim() || renameDraft.trim() === (renameTarget?.title ?? "")
                  }
                >
                  {isRenaming ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="library-dialog" role="dialog" aria-modal="true" aria-labelledby="library-delete-title">
          <div className="library-dialog__backdrop" onClick={closeDeleteDialog} />
          <div
            className="library-dialog__panel"
            role="document"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="library-dialog__title library-dialog__title--danger" id="library-delete-title">
              Delete score?
            </h3>
            <p className="library-dialog__description">
              Are you sure you want to remove{" "}
              <span className="library-dialog__highlight">&ldquo;{deleteTarget.title}&rdquo;</span>
              {" "}from your library? This action can&apos;t be undone.
            </p>
            <div className="library-dialog__actions">
              <button
                type="button"
                className="library-dialog__button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="library-dialog__button library-dialog__button--danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
