
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

let firebaseConfig: FirebaseOptions;

// In a server-side environment (like a build process or server component),
// process.env.FIREBASE_CONFIG will be a JSON string.
// On the client-side, this variable will be undefined.
if (process.env.FIREBASE_CONFIG) {
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
        console.error("Failed to parse FIREBASE_CONFIG. Check your environment variables.", e);
        throw new Error("Invalid FIREBASE_CONFIG environment variable.");
    }
} else {
    // This block is for the client-side, where NEXT_PUBLIC_ variables are available.
    // It dynamically constructs the config, which is necessary because the full
    // config object isn't exposed to the client directly for security.
    firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    };
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
        getAnalytics(app);
      } catch (e) {
        console.warn("Firebase Analytics could not be initialized.", e);
      }
    }
  });
}

export { app, auth, storage, db };
