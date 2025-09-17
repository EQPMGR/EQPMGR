
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let db: Firestore | null = null;

interface FirebaseServices {
    app: FirebaseApp;
    auth: Auth;
    storage: FirebaseStorage;
    db: Firestore;
}

// This promise will be initialized once and then reused.
let firebaseServicesPromise: Promise<FirebaseServices> | null = null;

async function _initializeFirebase(): Promise<FirebaseServices> {
    const response = await fetch('/api/config');
    if (!response.ok) {
        throw new Error("Failed to fetch Firebase config from server.");
    }
    const firebaseConfig: FirebaseOptions = await response.json();
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("CRITICAL: Firebase config fetched from server is invalid.", firebaseConfig);
        throw new Error("Invalid Firebase config received from server.");
    }
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);
    db = getFirestore(app);

    if (typeof window !== 'undefined') {
        isSupported().then(supported => {
            if (supported) {
                getAnalytics(app!);
            }
        });
    }

    return { app, auth, storage, db };
}

function getFirebaseServices(): Promise<FirebaseServices> {
    if (!firebaseServicesPromise) {
        if (getApps().length) {
            app = getApp();
            auth = getAuth(app);
            storage = getStorage(app);
            db = getFirestore(app);
            firebaseServicesPromise = Promise.resolve({ app, auth, storage, db });
        } else {
            firebaseServicesPromise = _initializeFirebase();
        }
    }
    return firebaseServicesPromise;
}

// We re-export the initialized services for use in the app.
// Note: Direct access should be within components that await getFirebaseServices.
export { app, auth, storage, db, getFirebaseServices };
