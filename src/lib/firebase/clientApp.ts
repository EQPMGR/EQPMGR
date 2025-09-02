import { initializeApp, getApps, getApp } from "firebase/app";

// This file is for the browser, and it will get its configuration
// from an environment variable we will set during deployment.

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

let app;
if (getApps().length === 0) {
  app = initializeApp(JSON.parse(firebaseConfig!));
} else {
  app = getApp();
}

export { app };