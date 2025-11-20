import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8Widpob3Er_5cJ83LKpuRbFsyZCcI6jc",
  authDomain: "notesight-67f0f.firebaseapp.com",
  projectId: "notesight-67f0f",
  storageBucket: "notesight-67f0f.firebasestorage.app",
  messagingSenderId: "810185468210",
  appId: "1:810185468210:web:805603f1eea273020a4f2b"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export default app;


