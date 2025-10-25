import { SidebarToggle } from "../../components/SideBar/SidebarToggle"
import { Link } from "react-router-dom"
import "./HomePage.css"

export function HomePage() {
  return (
    <>
      <SidebarToggle />
      <div className="home-container">
        <h1>Welcome to the Home Page</h1>

        {/* Button that navigates to the XML Player page */}
        <Link to="/xmlplayer" className="xmlplayer-btn">
          Open XML Player
        </Link>
      </div>
    </>
  )
}
