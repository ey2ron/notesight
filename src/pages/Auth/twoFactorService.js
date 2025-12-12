// Frontend-only 2FA service using EmailJS
// Sign up at https://www.emailjs.com/ to get your credentials

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_1tmhpwa";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_rn8m1cx";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "ug9a77ly43EWsZgv9";

const OTP_STORAGE_KEY = "notesight_2fa_otp";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with expiry
function storeOtp(email, otp) {
  const data = {
    email,
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  };
  sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(data));
}

// Get stored OTP data
function getStoredOtp() {
  const data = sessionStorage.getItem(OTP_STORAGE_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Clear stored OTP
export function clearOtp() {
  sessionStorage.removeItem(OTP_STORAGE_KEY);
}

// Send OTP via EmailJS
export async function sendOtp(email) {
  const otp = generateOtp();
  
  // Dynamically import EmailJS
  const emailjsModule = await import("@emailjs/browser");
  const emailjs = emailjsModule.default ?? emailjsModule;
  
  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        email: email,
        otp_code: otp,
        passcode: otp,
        app_name: "NoteSight",
      },
      EMAILJS_PUBLIC_KEY
    );
    
    console.log("EmailJS response:", response);
    storeOtp(email, otp);
    return { success: true, message: "Verification code sent to your email" };
  } catch (error) {
    console.error("Failed to send OTP:", JSON.stringify(error, null, 2));
    return { success: false, message: `Failed to send verification code: ${error?.text || error?.message || "Unknown error"}` };
  }
}

// Verify OTP
export function verifyOtp(email, inputOtp) {
  const stored = getStoredOtp();
  
  if (!stored) {
    return { success: false, message: "No verification code found. Please request a new one." };
  }
  
  if (stored.email !== email) {
    return { success: false, message: "Email mismatch. Please request a new code." };
  }
  
  if (Date.now() > stored.expiresAt) {
    clearOtp();
    return { success: false, message: "Verification code has expired. Please request a new one." };
  }
  
  if (stored.otp !== inputOtp) {
    return { success: false, message: "Invalid verification code" };
  }
  
  clearOtp();
  return { success: true, message: "Verification successful" };
}

// Resend OTP
export async function resendOtp(email) {
  clearOtp();
  return sendOtp(email);
}
