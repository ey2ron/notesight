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
      <button
        className={`toggle-btn ${isOpen ? "open" : ""}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Close profile sidebar" : "Open profile sidebar"}
        aria-expanded={isOpen}
        type="button"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen && <div className="overlay" onClick={toggleSidebar}></div>}

      
      <div className={`sidebar-wrapper ${isOpen ? "open" : ""}`}>
        <ProfileSidebar />
      </div>
    </>
  );
}
