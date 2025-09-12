
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// This file is being refactored to fetch its configuration from a server endpoint
// to ensure consistency between client and server environments.

let app = getApps().length ? getApp() : null;

async function getFirebaseConfig(): Promise<FirebaseOptions> {
    // Fetch the configuration from our own API route.
    // This is more reliable than relying on client-side environment variables.
    const response = await fetch('/api/config');
    if (!response.ok) {
        throw new Error("Failed to fetch Firebase config from server.");
    }
    return response.json();
}

async function initializeFirebase() {
    if (!app) {
        const firebaseConfig = await getFirebaseConfig();
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            console.error("CRITICAL: Firebase config fetched from server is invalid.", firebaseConfig);
            throw new Error("Invalid Firebase config received from server.");
        }
        app = initializeApp(firebaseConfig);
        
        // Initialize Analytics only on the client side if supported
        if (typeof window !== 'undefined') {
          isSupported().then(supported => {
            if (supported) {
              getAnalytics(app!);
            }
          });
        }
    }
    return app;
}

// Export a function that ensures initialization before returning services.
async function getFirebaseServices() {
    const initializedApp = await initializeFirebase();
    return {
        app: initializedApp,
        auth: getAuth(initializedApp),
        storage: getStorage(initializedApp),
        db: getFirestore(initializedApp),
    };
}

// For components that need direct access, we can export the initialized services.
// Note: These will be initialized asynchronously.
let auth, storage, db;
if (typeof window !== 'undefined') {
    getFirebaseServices().then(services => {
        auth = services.auth;
        storage = services.storage;
        db = services.db;
    });
}

// We re-export the services for use in the app, but now they are initialized reliably.
export { app, auth, storage, db, getFirebaseServices, initializeFirebase };
