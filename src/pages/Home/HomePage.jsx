import { useMemo, useState } from "react"
import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import { OMRUpload } from "../../components/OMRUpload"
import { FavoritesPanel } from "../../components/Home/FavoritesPanel"
import { LibraryPanel } from "../../components/Home/LibraryPanel"
import "./HomePage.css"
import HomeBg from "../Landing/assets/BG.png"

const INITIAL_LIBRARY = [
  {
    id: "png-sketch",
    title: "Orchestral Sketch",
    type: "PNG",
    thumbColor: "#E6F3ED",
    previewVariant: "image",
    previewGlyph: "🖼️",
    lastOpened: "Oct 25",
  },
  {
    id: "jpg-lead-sheet",
    title: "Lead Sheet Study",
    type: "JPG",
    thumbColor: "#FFF2E1",
    previewVariant: "image",
    previewGlyph: "🖼️",
    lastOpened: "Oct 18",
  },
  {
    id: "pdf-audiveris",
    title: "Audiveris Demo",
    type: "PDF",
    thumbColor: "#E9F0FF",
    previewVariant: "pdf",
    previewGlyph: "📄",
    lastOpened: "Sep 12",
  },
  {
    id: "mxl-quartet",
    title: "String Quartet Draft",
    type: "MXL",
    thumbColor: "#F7EAFE",
    previewVariant: "music",
    previewGlyph: "🎵",
    lastOpened: "Aug 2",
  },
]

export function HomePage() {
  const fileInputId = "home-omr-file"
  const [activePanel, setActivePanel] = useState("favorites")
  const [libraryItems, setLibraryItems] = useState(INITIAL_LIBRARY)
  const [favoriteIds, setFavoriteIds] = useState([])

  const handleGetStarted = () => {
    const input = document.getElementById(fileInputId)
    if (input) {
      input.focus()
      input.click()
    }
  }

  const handleSectionChange = (section) => {
    setActivePanel(section)
  }

  const handleFavorite = (itemId) => {
    setFavoriteIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]))
  }

  const handleUnfavorite = (itemId) => {
    setFavoriteIds((prev) => prev.filter((id) => id !== itemId))
  }

  const favoriteItems = useMemo(
    () => libraryItems.filter((item) => favoriteIds.includes(item.id)),
    [libraryItems, favoriteIds],
  )

  const handleRename = (itemId) => {
    if (typeof window === "undefined") {
      return
    }
    const target = libraryItems.find((item) => item.id === itemId)
    if (!target) {
      return
    }

    const nextTitle = window.prompt("Rename score", target.title)
    if (!nextTitle) {
      return
    }

    const trimmed = nextTitle.trim()
    if (!trimmed || trimmed === target.title) {
      return
    }

    setLibraryItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, title: trimmed } : item)))
  }

  const handleDelete = (itemId) => {
    setLibraryItems((prev) => prev.filter((item) => item.id !== itemId))
    setFavoriteIds((prev) => prev.filter((favId) => favId !== itemId))
  }

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
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ) : (
              <FavoritesPanel
                items={favoriteItems}
                onUnfavorite={handleUnfavorite}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
