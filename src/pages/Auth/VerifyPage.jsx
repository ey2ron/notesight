import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "./firebase.jsx";
import { verifyOtp, resendOtp } from "./twoFactorService.js";
import "./VerifyPage.css";

export function VerifyPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  const { email, password } = location.state || {};

  useEffect(() => {
    if (!email || !password) {
      navigate("/login", { replace: true });
    }
  }, [email, password, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasteData.length === 6) {
      setOtp(pasteData.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit code", { position: "top-left" });
      return;
    }

    setIsLoading(true);

    try {
      const result = verifyOtp(email, otpString);

      if (result.success) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Login successful!", { position: "top-left" });
        navigate("/home", { replace: true });
      } else {
        toast.error(result.message || "Invalid verification code", { position: "top-left" });
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed. Please try again.", { position: "top-left" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);

    try {
      const result = await resendOtp(email);

      if (result.success) {
        toast.success("New code sent to your email", { position: "top-left" });
        setCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(result.message || "Failed to resend code", { position: "top-left" });
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend code. Please try again.", { position: "top-left" });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login", { replace: true });
  };

  if (!email || !password) {
    return null;
  }

  return (
    <div className="verify-container">
      <div className="verify-card">
        <div className="verify-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
            <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
          </svg>
        </div>

        <h2>Check your email</h2>
        <p className="verify-subtitle">
          We sent a verification code to<br />
          <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify} className="verify-form">
          <div className="otp-inputs" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                autoFocus={index === 0}
                disabled={isLoading}
              />
            ))}
          </div>

          <button type="submit" className="verify-btn" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="verify-actions">
          <p className="resend-text">
            Didn't receive the code?{" "}
            <button
              type="button"
              className="resend-btn"
              onClick={handleResend}
              disabled={countdown > 0 || isResending}
            >
              {isResending
                ? "Sending..."
                : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend"}
            </button>
          </p>
          <p className="verify-hint">Check your spam or junk folder if the email hasn't arrived yet.</p>
          <button type="button" className="back-btn" onClick={handleBackToLogin}>
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
