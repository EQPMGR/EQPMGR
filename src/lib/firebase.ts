
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// This configuration uses environment variables that are set during the build process.
// It's the standard and most reliable way for Next.js on App Hosting.
const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Missing Firebase config. Ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set.");
}


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Initialize Analytics only on the client side if supported
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      try {
        // Check if measurementId is available in the config before initializing
        if (firebaseConfig.measurementId) {
          getAnalytics(app);
        }
      } catch (e) {
        console.warn("Firebase Analytics could not be initialized.", e);
      }
    }
  });
}

export { app, auth, storage, db };
