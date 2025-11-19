import { useEffect, useState } from "react";
import { FaArrowLeft, FaUserCircle } from "react-icons/fa";
import { auth, db } from "../../pages/Auth/firebase.jsx";
import { doc, setDoc } from "firebase/firestore";
import { updateEmail, updateProfile } from "firebase/auth";
import { toast } from "react-toastify";
import "./ProfileSidebar.css";

export function AccountSidebar({ onBack, userData, onUserDataChange, onAvatarChange }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formState, setFormState] = useState({ name: "", username: "", email: "" });

    useEffect(() => {
        if (userData) {
            setFormState({
                name: userData.name ?? "",
                username: userData.username ?? "",
                email: userData.email ?? "",
            });
        }
    }, [userData]);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            window.location.href = "/";
            console.log("User signed out successfully");
        } catch (error) {
            console.error("Error signing out:", error);
            toast.error("Unable to sign out.", { position: "top-left" });
        }
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormState((prev) => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        if (userData) {
            setFormState({
                name: userData.name ?? "",
                username: userData.username ?? "",
                email: userData.email ?? "",
            });
        }
        setIsEditing(false);
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!userData?.uid) {
            toast.error("No user loaded.", { position: "top-left" });
            return;
        }

        const trimmedName = formState.name.trim();
        const trimmedUsername = formState.username.trim();
        const trimmedEmail = formState.email.trim();

        if (!trimmedUsername) {
            toast.error("Username cannot be empty.", { position: "top-left" });
            return;
        }

        setIsSaving(true);

        let emailToPersist = trimmedEmail;
        let emailUpdateError = null;

        if (auth.currentUser) {
            if (trimmedName && auth.currentUser.displayName !== trimmedName) {
                try {
                    await updateProfile(auth.currentUser, { displayName: trimmedName });
                } catch (error) {
                    console.error("Failed to update display name:", error);
                }
            }

            if (
                trimmedEmail &&
                auth.currentUser.email &&
                auth.currentUser.email.toLowerCase() !== trimmedEmail.toLowerCase()
            ) {
                try {
                    await updateEmail(auth.currentUser, trimmedEmail);
                } catch (error) {
                    console.error("Failed to update email:", error);
                    emailUpdateError = error;
                    emailToPersist = userData.email ?? trimmedEmail;
                }
            }
        }

        try {
            const docRef = doc(db, "users", userData.uid);
            await setDoc(
                docRef,
                {
                    name: trimmedName,
                    username: trimmedUsername,
                    email: emailToPersist,
                },
                { merge: true }
            );

            onUserDataChange((prev) =>
                prev
                    ? {
                            ...prev,
                            name: trimmedName,
                            username: trimmedUsername,
                            email: emailToPersist,
                        }
                    : {
                            uid: userData.uid,
                            name: trimmedName,
                            username: trimmedUsername,
                            email: emailToPersist,
                            avatarUrl: userData.avatarUrl ?? "",
                        }
            );

            if (emailUpdateError) {
                const errorMessage =
                    emailUpdateError?.code === "auth/requires-recent-login"
                        ? "Please sign in again to change your email."
                        : "Failed to update email address.";
                toast.error(errorMessage, {
                    position: "top-left",
                });
                setFormState((prev) => ({ ...prev, email: emailToPersist }));
            } else {
                toast.success("Account updated.", { position: "top-left" });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Failed to update account details:", error);
            toast.error("Failed to update account details.", { position: "top-left" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="account-sidebar">
            <button className="back-button" onClick={onBack}>
                <FaArrowLeft />
            </button>
            {userData ? (
                <>
                    <h2 className="account-title">ACCOUNT SETTINGS</h2>

                    <div className="account-avatar">
                        {userData.avatarUrl ? (
                            <img
                                src={userData.avatarUrl}
                                alt="Profile avatar"
                                className="profile-avatar-image"
                            />
                        ) : (
                            <FaUserCircle className="profile-avatar" />
                        )}
                        {isEditing && (
                            <input
                                type="file"
                                accept="image/*"
                                className="avatar-input"
                                onChange={onAvatarChange}
                            />
                        )}
                        <p className="profile-name">{userData.username}</p>
                    </div>

                    {!isEditing ? (
                        <>
                            <div className="account-info">
                                <div className="info-row">
                                    <p className="info-label">Name</p>
                                    <p className="info-value">{userData.name || "—"}</p>
                                </div>
                                <div className="info-row">
                                    <p className="info-label">Username</p>
                                    <p className="info-value">{userData.username}</p>
                                </div>
                                <div className="info-row">
                                    <p className="info-label">Email</p>
                                    <p className="info-value">{userData.email}</p>
                                </div>
                            </div>

                            <button className="edit-btn" onClick={() => setIsEditing(true)}>
                                Edit profile
                            </button>
                        </>
                    ) : (
                        <form className="account-info" onSubmit={handleSave}>
                            <div className="info-row">
                                <label className="info-label" htmlFor="account-name">
                                    Name
                                </label>
                                <input
                                    id="account-name"
                                    name="name"
                                    className="info-input"
                                    value={formState.name}
                                    onChange={handleInputChange}
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="info-row">
                                <label className="info-label" htmlFor="account-username">
                                    Username
                                </label>
                                <input
                                    id="account-username"
                                    name="username"
                                    className="info-input"
                                    value={formState.username}
                                    onChange={handleInputChange}
                                    placeholder="Username"
                                    required
                                />
                            </div>
                            <div className="info-row">
                                <label className="info-label" htmlFor="account-email">
                                    Email
                                </label>
                                <input
                                    id="account-email"
                                    name="email"
                                    type="email"
                                    className="info-input"
                                    value={formState.email}
                                    onChange={handleInputChange}
                                    placeholder="Email"
                                    required
                                />
                            </div>

                            <div className="account-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        </form>
                    )}

                    <button className="logout-btn" onClick={handleLogout}>
                        Log out
                    </button>
                </>
            ) : (
                <p>Loading user data...</p>
            )}
        </div>
    );
}
