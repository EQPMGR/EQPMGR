import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "eqpmgr-test.firebaseapp.com",
  projectId: "eqpmgr-test",
  storageBucket: "eqpmgr-test.firebasestorage.app",
  messagingSenderId: "298785422478",
  appId: "1:298785422478:web:083473c4625749ef24dddf",
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export { app };