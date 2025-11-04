import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import "./Signuppage.css";
import { FcGoogle } from "react-icons/fc";
import { FiArrowRight } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth, db, googleProvider } from "./firebase.jsx";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";

export function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const navigate = useNavigate();

  const handlerRegister = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.", {
        position: "top-left",
      });
      console.log("Password too short");
      return;
    }

    if (password !== rePassword) {
      toast.error("Passwords do not match.", {
        position: "top-left",
      });
      console.log("Passwords do not match");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      console.log("Registered user:", user);

      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          name: name,
          username: username,
          email: email,
        });
        console.log("User data saved to Firestore");
      }

      console.log("Registration successful");
      toast.success("Registration successful!", {
        position: "top-left",
      });
  navigate("/home", { replace: true });

    } catch (error) {
      console.error("Error during registration:", error.message);
      toast.error(`Registration failed: ${error.message}`, {
        position: "top-left",
      });
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            name: user.displayName || "",
            username: user.displayName ? user.displayName.replace(/\s+/g, "").toLowerCase() : "",
            email: user.email || "",
          },
          { merge: true }
        );
      }

      toast.success("Signed in with Google!", {
        position: "top-left",
      });
      navigate("/home", { replace: true });
    } catch (error) {
      console.error("Google sign-in failed:", error.message);
      toast.error(`Google sign-in failed: ${error.message}`, {
        position: "top-left",
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="logo">🎵</div>
        <h2>Are you new?</h2>
        <p className="subtitle">Please enter your details</p>

        <form onSubmit={handlerRegister} className="auth-form">
          <input
            type="text"
            className="form-control"
            placeholder="Full Name"
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            className="form-control"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            className="form-control"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="form-control"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="form-control"
            placeholder="Re-enter Password"
            onChange={(e) => setRePassword(e.target.value)}
            required
          />

          <p className="redirect">
            Already have an account? <Link to="/login">Log in here</Link>
          </p>
          <button type="submit" className="auth-btn">
            <FiArrowRight />
          </button>
        </form>

        <p className="continue">Continue with</p>
        <div className="google-btn" onClick={handleGoogleSignup} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleGoogleSignup()}>
          <FcGoogle size={28} />
        </div>
      </div>

      <div className="auth-right">
        <ul>
          <li>
            <span className="icon">🎧</span> Instant Audio Playback
          </li>
          <li>
            <span className="icon">🧠</span> Cutting-Edge OMR Technology
          </li>
          <li>
            <span className="icon">🎼</span> Inclusive Learning Tool
          </li>
          <li>
            <span className="icon">⏱️</span> Adjustable Tempo Control
          </li>
        </ul>
      </div>
    </div>
  );
}
