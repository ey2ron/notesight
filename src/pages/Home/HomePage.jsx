import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import { Link } from "react-router-dom"
import "./HomePage.css"
import HomeBg from "../Auth/assets/home.png"

export function HomePage() {
  return (
    <>
      <SidebarToggle />
      <div className="home-hero" style={{ backgroundImage: `url(${HomeBg})` }}>
        <div className="home-overlay" />
        <div className="home-content">
          <div className="home-heading-group">
            <p className="home-kicker">Welcome to</p>
            <h1 className="home-title">NoteSight</h1>
            <p className="home-subtitle">
              Transform sheet music into sound instantly with our optical music recognition technology.
            </p>
          </div>

          {/* Button that navigates to the XML Player page */}
          <Link to="/xmlplayer" className="xmlplayer-btn">
            Get Started
          </Link>
        </div>
      </div>
    </>
  )
}
