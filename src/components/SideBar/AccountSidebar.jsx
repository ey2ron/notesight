import { useEffect, useState} from "react";
import { FaArrowLeft, FaUserCircle } from "react-icons/fa";
import {auth,db} from"../../pages/Auth/firebase.jsx";
import {doc,getDoc} from"firebase/firestore";
import "./ProfileSidebar.css";

export function AccountSidebar({ onBack }) {
    const [userData, setUserData] = useState(null);
    const fetchUserData = async () => {
        auth.onAuthStateChanged(async (user) => {
            console.log("Auth state changed:", user);
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                console.log("User data:", docSnap.data());
                setUserData(docSnap.data());
            } else {
                console.log("No such document!");
            }
        });
    };    
    useEffect(() => {
        fetchUserData();
    }, []);

    async function handleLogout() {
        try {
            await auth.signOut();
            window.location.href = "/";
            console.log("User signed out successfully");
        } catch (error) {  
            console.error("Error signing out:", error);
            
        }
    }
  return (
                
    <div className="account-sidebar">
      <button className="back-button" onClick={onBack}>
        <FaArrowLeft />
      </button>
        {userData ? (    
        <>
        <h2 className="account-title">ACCOUNT SETTINGS</h2>

        <div className="account-avatar">
            <FaUserCircle className="profile-avatar" />
            <p className="profile-name">{userData.username} </p>
        </div>

        <div className="account-info">
            <div className="info-row">
                <p className="info-label">Name</p>
                <p className="info-value">{userData.username}</p>
            </div>
            <div className="info-row">
                <p className="info-label">Email</p>
                <p className="info-value">{userData.email}</p>
            </div>
        </div>

        <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </>
        ) : (
        <p>Loading user data...</p>
        )}
    </div>
  );
}
