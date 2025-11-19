import { useState } from "react"
import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import { OMRUpload } from "../../components/OMRUpload"
import { FavoritesPanel } from "../../components/Home/FavoritesPanel"
import { LibraryPanel } from "../../components/Home/LibraryPanel"
import "./HomePage.css"
import HomeBg from "../Landing/assets/BG.png"

export function HomePage() {
  const fileInputId = "home-omr-file"
  const [activePanel, setActivePanel] = useState("favorites")

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
            {activePanel === "library" ? <LibraryPanel /> : <FavoritesPanel />}
          </div>
        </div>
      </div>
    </>
  )
}
