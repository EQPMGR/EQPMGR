import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC1hou9OBPyYAkX1Cek1BvyAITARkhCzDE",
  authDomain: "eqpmgr-f82e7.firebaseapp.com",
  projectId: "eqpmgr-f82e7",
  storageBucket: "eqpmgr-f82e7.appspot.com",
  messagingSenderId: "111719283783",
  appId: "1:111719283783:web:5e83cc7e9ba8c8f6e84562",
  measurementId: "G-BS4C41B3TE"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Firestore with the recommended settings for robust offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { app, auth, storage, db };
