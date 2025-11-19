import React, { useEffect, useState } from "react";
import { FaUserCircle, FaHeart, FaCog, FaBook } from "react-icons/fa";
import "./ProfileSidebar.css";
import { AccountSidebar } from "./AccountSidebar";
import { auth, db } from "../../pages/Auth/firebase.jsx";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";

export function ProfileSidebar({ onSelectSection }) {
  const [showAccount, setShowAccount] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Listen for auth changes so we can hydrate the sidebar with Firestore data.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserData(null);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        const persisted = docSnap.exists() ? docSnap.data() : {};
        setUserData({
          uid: user.uid,
          email: persisted.email ?? user.email ?? "",
          username:
            persisted.username ??
            persisted.name ??
            user.displayName ??
            "USER NAME",
          name: persisted.name ?? persisted.username ?? user.displayName ?? "",
          avatarUrl: persisted.avatarUrl ?? user.photoURL ?? "",
        });
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        toast.error("Could not load profile details.", { position: "top-left" });
        setUserData({
          uid: user.uid,
          email: user.email ?? "",
          username: user.displayName ?? "USER NAME",
          name: user.displayName ?? "",
          avatarUrl: user.photoURL ?? "",
        });
      }
    });

    return unsubscribe;
  }, []);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    const currentUser = auth.currentUser;

    if (!file || !currentUser) {
      event.target.value = "";
      return;
    }

    const MAX_SIZE_BYTES = 200 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Profile image must be smaller than 200 KB.", {
        position: "top-left",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") {
        toast.error("Unsupported image format.", { position: "top-left" });
        event.target.value = "";
        return;
      }

      try {
        const docRef = doc(db, "users", currentUser.uid);
        await setDoc(
          docRef,
          { avatarUrl: reader.result },
          { merge: true }
        );

        setUserData((prev) =>
          prev
            ? { ...prev, avatarUrl: reader.result }
            : {
                uid: currentUser.uid,
                email: currentUser.email ?? "",
                username: currentUser.displayName ?? "USER NAME",
                name: currentUser.displayName ?? "",
                avatarUrl: reader.result,
              }
        );
        toast.success("Profile picture updated.", { position: "top-left" });
      } catch (error) {
        console.error("Failed to update avatar:", error);
        toast.error("Could not update profile picture.", {
          position: "top-left",
        });
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsDataURL(file);
  };

  const displayName = userData?.username || userData?.name || "USER NAME";

  const handleSectionClick = (section) => {
    if (onSelectSection) {
      onSelectSection(section);
    }
    setShowAccount(false);
  };

  return (
    <div className="sidebar-container">
      {!showAccount ? (
        <div className="profile-sidebar">
          <div className="profile-header">
            {userData?.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt="Profile avatar"
                className="profile-avatar-image"
              />
            ) : (
              <FaUserCircle className="profile-avatar" />
            )}
            <h2 className="profile-name">{displayName}</h2>
          </div>

          <div className="profile-menu">
            <div className="menu-item" onClick={() => handleSectionClick("library")}>
              <FaBook className="menu-icon" />
              <span>My Library</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item" onClick={() => handleSectionClick("favorites")}>
              <FaHeart className="menu-icon" />
              <span>Favorites</span>
              <span className="arrow">›</span>
            </div>
            <div className="menu-item" onClick={() => setShowAccount(true)}>
              <FaCog className="menu-icon" />
              <span>Account Settings</span>
              <span className="arrow">›</span>
            </div>
          </div>
        </div>
      ) : (
        <AccountSidebar
          onBack={() => setShowAccount(false)}
          userData={userData}
          onUserDataChange={setUserData}
          onAvatarChange={handleAvatarChange}
        />
      )}
    </div>
  );
}
