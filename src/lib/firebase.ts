
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// This configuration uses environment variables that are set during the build process
// by apphosting.yaml. This is the most reliable way for Next.js on App Hosting.
const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
};

// A basic check to ensure the essential variables are present.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("Missing Firebase config from environment variables. This may be expected during the build process.");
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
