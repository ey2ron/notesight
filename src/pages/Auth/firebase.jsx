// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-HabA5ZLOP_jWaphUidrDnDT4iS0Zf4U",
  authDomain: "note-s-a3734.firebaseapp.com",
  projectId: "note-s-a3734",
  storageBucket: "note-s-a3734.firebasestorage.app",
  messagingSenderId: "784455625915",
  appId: "1:784455625915:web:a8110bd4dc3e5e56a44d9e",
  measurementId: "G-BHXD9VRZ5D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;


