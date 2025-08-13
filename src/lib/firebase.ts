
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: "AIzaSyCbDubpUzZRcEEB2WHY9OxeKoMQVVCjgLY",
  authDomain: "eqpmgr-test.firebaseapp.com",
  projectId: "eqpmgr-test",
  storageBucket: "eqpmgr-test.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_FIREBASE_APP_ID",
  measurementId: "REPLACE_WITH_YOUR_MEASUREMENT_ID"
};

// DEBUG: Log the config to the browser console to verify it's loaded.
if (typeof window !== 'undefined') {
  console.log("Firebase Config Loaded:", {
      apiKey: firebaseConfig.apiKey ? 'Loaded' : 'MISSING!',
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
  });
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase config is missing or incomplete. Please check your .env files.");
  }
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Initialize Performance and Analytics only on the client side and if keys are present
if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  // getPerformance(app); // Disabled to prevent client-side errors with long class names
  isSupported().then(supported => {
    if (supported) {
      getAnalytics(app);
    }
  });
}


export { app, auth, storage, db };
