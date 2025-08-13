
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

// This configuration now securely loads from your .env.local file.
// It is the standard and recommended way to handle client-side credentials.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// DEBUG: Log the config to the browser console to verify it's loaded.
if (typeof window !== 'undefined') {
  console.log("Firebase Config Loaded:", {
      apiKey: firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REPLACE') ? 'Loaded' : 'MISSING!',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
  });
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('REPLACE')) {
      console.error("Firebase config is missing or incomplete. Please fill out the values in your .env.local file and restart the development server.");
  }
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Initialize Performance and Analytics only on the client side and if keys are present
if (typeof window !== 'undefined' && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REPLACE')) {
  // getPerformance(app); // Disabled to prevent client-side errors with long class names
  isSupported().then(supported => {
    if (supported) {
      getAnalytics(app);
    }
  });
}


export { app, auth, storage, db };
