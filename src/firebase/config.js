import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdgtcn8XYYNEBHOqZ3Bkfh52kwGT4RxN8",
  authDomain: "sijin-os.firebaseapp.com",
  projectId: "sijin-os",
  storageBucket: "sijin-os.firebasestorage.app",
  messagingSenderId: "292487372751",
  appId: "1:292487372751:web:8440ecab057d1eb6a3bcba",
  measurementId: "G-DRYK5XE4FP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
