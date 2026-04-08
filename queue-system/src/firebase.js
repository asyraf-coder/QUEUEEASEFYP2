import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, browserSessionPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBTjGeBFL0Cu23o0QcKTgMWcN3myjTHduA",
  authDomain: "broz-queue.firebaseapp.com",
  projectId: "broz-queue",
  storageBucket: "broz-queue.firebasestorage.app",
  messagingSenderId: "843482325645",
  appId: "1:843482325645:web:73cf9a0f44e61c4ca338c4",
  measurementId: "G-R1090YJ2SY"
};

// Primary app — used for everything
const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);

// ✅ Secondary app — used ONLY for creating new staff accounts
// Creating an account with Firebase automatically signs in as that user.
// Using a separate app instance prevents the current admin from being signed out.
const secondaryApp = initializeApp(firebaseConfig, 'secondary');
export const secondaryAuth = getAuth(secondaryApp);