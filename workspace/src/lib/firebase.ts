import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// This configuration will be automatically populated by App Hosting.
// It does not need to be manually configured.
const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!);

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Initialize Analytics only on the client side if supported
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      try {
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
