import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

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
const db = getFirestore(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
    }).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence.');
        }
    });
} catch (error) {
    console.error("Error enabling firestore persistence", error);
}


export { app, auth, storage, db };
