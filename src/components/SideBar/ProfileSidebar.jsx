import React, { useState } from "react";
import { FaUserCircle, FaHeart, FaCog, FaBook } from "react-icons/fa";
import "./ProfileSidebar.css";
import { AccountSidebar } from "./AccountSidebar";

export function ProfileSidebar() {
  const [showAccount, setShowAccount] = useState(false);

  return (
    <div className="sidebar-container">
      {!showAccount ? (
        <div className="profile-sidebar">
          <div className="profile-header">
            <FaUserCircle className="profile-avatar" />
            <h2 className="profile-name">USER NAME</h2>
          </div>

          <div className="profile-menu">
            <div className="menu-item">
              <FaBook className="menu-icon" />
              <span>My Library</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item">
              <FaHeart className="menu-icon" />
              <span>Favorites</span>
              <span className="arrow">›</span>
            </div>
            <div
              className="menu-item"
              onClick={() => setShowAccount(true)}
            >
              <FaCog className="menu-icon" />
              <span>Account Settings</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>
      ) : (
        <AccountSidebar onBack={() => setShowAccount(false)} />
      )}
    </div>
  );
}
