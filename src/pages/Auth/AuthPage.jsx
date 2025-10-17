import React, { useState } from "react";
import "./AuthPage.css";
import { FcGoogle } from "react-icons/fc";

export function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-logo">
          <span className="logo-icon">🎵</span>
        </div>
        <h2>Welcome {isSignup ? "aboard" : "back"}</h2>
        <p>Please {isSignup ? "create your account" : "enter your details"}</p>

        <form className="auth-form">
          {isSignup && (
            <input type="text" placeholder="Full Name" className="auth-input" />
          )}
          <input type="email" placeholder="Email" className="auth-input" />
          <input type="password" placeholder="Password" className="auth-input" />

          {!isSignup && (
            <div className="auth-options">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="forgot-password">Forgot Password</a>
            </div>
          )}

          <button type="submit" className="auth-btn">
            {isSignup ? "Sign Up" : "Login"}
          </button>

          <div className="divider">or continue with</div>

          <div className="social-login">
            <button className="social-btn"><FcGoogle size={20} /></button>
          </div>

          <p className="toggle-text">
            {isSignup ? "Already have an account?" : "Don’t have an account?"}{" "}
            <span onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? "Login" : "Sign Up"}
            </span>
          </p>
        </form>
      </div>

      <div className="auth-right">
        <div className="feature">
          <div className="feature-icon">🎧</div>
          <p>Instant Audio Playback</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🧠</div>
          <p>Cutting-Edge OMR Technology</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🔧</div>
          <p>Inclusive Learning Tool</p>
        </div>
        <div className="feature">
          <div className="feature-icon">⏱️</div>
          <p>Adjustable Tempo Control</p>
        </div>
      </div>
    </div>
  );
}
