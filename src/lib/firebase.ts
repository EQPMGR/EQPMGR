import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1hou9OBPyYAkX1Cek1BvyAITARkhCzDE",
  authDomain: "eqpmgr-f82e7.firebaseapp.com",
  projectId: "eqpmgr-f82e7",
  storageBucket: "eqpmgr-f82e7.appspot.com",
  messagingSenderId: "111719283783",
  appId: "1:111719283783:web:5e83cc7e9ba8c8f6e84562"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
