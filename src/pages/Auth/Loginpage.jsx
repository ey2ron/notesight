import "./Loginpage.css";
import { FcGoogle } from "react-icons/fc";
import { FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase.jsx";


export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log("Logged in user:");
        } catch (error) {
            console.error("Error during login:", error.message);
        }
    }
  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="logo">🎵</div>
        <h2>Welcome back</h2>
        <p className="subtitle">Please enter your details</p>

        <form onSubmit={handleLogin} className="auth-form">
          <input 
            type="email" 
            classname ="form-control"
            placeholder="Enter email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)} 
            />
          <input 
            type="password"
            classname ="form-control"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)} 
            />
          <p className="redirect">
            Don’t have an account? <Link to="/signup">Sign up here</Link>
          </p>
          <button type="submit" className="auth-btn">
            <FiArrowRight />
          </button>
        </form>

        <p className="continue">Continue with</p>
        <div className="google-btn">
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
