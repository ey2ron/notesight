import "./Loginpage.css";
import { FcGoogle } from "react-icons/fc";
import { FiArrowRight } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { toast } from "react-toastify";
import { auth, googleProvider } from "./firebase.jsx";
import InstantAudioPlaybackIcon from "./assets/InstantAudioPlayback.png";
import CuttingEdgeIcon from "./assets/CuttingEdge.png";
import InclusiveLearningIcon from "./assets/InclusiveLearning.png";
import AdjustableTempoIcon from "./assets/AdjustableTempo.png";


export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
  const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/home", { replace: true });
      console.log("Logged in user:");
      toast.success("Login successful!", {
        position: "top-left",
      });
        } catch (error) {
            
            console.error("Error during login:", error.message);
      toast.error(`Login failed: ${error.message}`, {
        position: "top-left",
      });
        }
    }

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
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
  }
  return (
    <div className="auth-container">
      <div className="auth-left">
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
        <div className="google-btn" onClick={handleGoogleLogin} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleGoogleLogin()}>
          <FcGoogle size={28} />
        </div>
      </div>

      <div className="auth-right">
        <ul>
          <li>
            <span className="icon">
              <img src={InstantAudioPlaybackIcon} alt="Instant Audio Playback icon" />
            </span>
            Instant Audio Playback
          </li>
          <li>
            <span className="icon">
              <img src={CuttingEdgeIcon} alt="Cutting-Edge OMR Technology icon" />
            </span>
            Cutting-Edge OMR Technology
          </li>
          <li>
            <span className="icon">
              <img src={InclusiveLearningIcon} alt="Inclusive Learning Tool icon" />
            </span>
            Inclusive Learning Tool
          </li>
          <li>
            <span className="icon">
              <img src={AdjustableTempoIcon} alt="Adjustable Tempo Control icon" />
            </span>
            Adjustable Tempo Control
          </li>
        </ul>
      </div>
    </div>
  );
}
