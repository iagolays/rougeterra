import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPR-9NXCg1EC6XqV0xye86M6c4fM0t524",
  authDomain: "rogueterra.firebaseapp.com",
  projectId: "rogueterra",
  storageBucket: "rogueterra.firebasestorage.app",
  messagingSenderId: "243436684082",
  appId: "1:243436684082:web:c13129789604ee89084d2b",
  measurementId: "G-HVBPVZTBK3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
