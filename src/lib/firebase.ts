import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: "AIzaSyBmjQjRubeRl_hoAJLDxvhexEwGPvpxj4k",
  authDomain: "eqpmgr-f82e7.firebaseapp.com",
  projectId: "eqpmgr-f82e7",
  storageBucket: "eqpmgr-f82e7.appspot.com",
  messagingSenderId: "360015622336",
  appId: "1:360015622336:web:659646c268803a6c4a3504",
  measurementId: "G-C727W1735H"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Initialize Performance and Analytics only on the client side
if (typeof window !== 'undefined') {
  getPerformance(app);
  isSupported().then(supported => {
    if (supported) {
      getAnalytics(app);
    }
  });
}


export { app, auth, storage, db };
