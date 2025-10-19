import { useState } from "react";
import { ProfileSidebar } from "./ProfileSidebar";
import "./SidebarToggle.css";

export function SidebarToggle() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Example Button (you can place this anywhere) */}
      <button className="toggle-btn" onClick={toggleSidebar}>
        Open Profile
      </button>

      {/* Overlay (dark background when open) */}
      {isOpen && <div className="overlay" onClick={toggleSidebar}></div>}

      {/* Sidebar slides in from the right */}
      <div className={`sidebar-wrapper ${isOpen ? "open" : ""}`}>
        <ProfileSidebar />
      </div>
    </>
  );
}
