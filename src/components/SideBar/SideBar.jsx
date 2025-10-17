import { FaUserCircle, FaHeart, FaCog, FaInfoCircle, FaMusic } from "react-icons/fa";
import "./Sidebar.css";

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <FaUserCircle className="profile-icon" />
        </div>

        <nav className="sidebar-menu">
          <a href="#library" className="menu-item">
            <FaMusic /> My Library
          </a>
          <a href="#favorites" className="menu-item">
            <FaHeart /> Favorites
          </a>
          <a href="#settings" className="menu-item">
            <FaCog /> Settings
          </a>
          <a href="#about" className="menu-item">
            <FaInfoCircle /> About Us
          </a>
        </nav>

        <button className="logout-btn">Log out</button>
      </div>

      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
    </>
  );
}
