
import * as admin from 'firebase-admin';
import 'dotenv/config';
import { accessSecret } from './secrets';

let app: admin.app.App;
let adminInitializationError: Error | null = null;
let adminPromise: Promise<admin.app.App>;

if (!admin.apps.length) {
  console.log('Firebase Admin SDK Initialization: No apps found, attempting to initialize...');
  
  adminPromise = (async () => {
    try {
      const [privateKey, clientEmail, projectId] = await Promise.all([
        accessSecret('FIREBASE_PRIVATE_KEY'),
        accessSecret('FIREBASE_CLIENT_EMAIL'),
        accessSecret('FIREBASE_PROJECT_ID'),
      ]);

      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };
      
      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('One or more Firebase Admin SDK credentials were not found in Secret Manager.');
      }
      
      const newApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('Firebase Admin SDK Initialization: App initialized successfully.');
      return newApp;

    } catch (error: any) {
      console.error('Firebase admin initialization error:', error.message);
      adminInitializationError = error;
      // Propagate the error so that attempts to use the SDK will fail clearly.
      throw error;
    }
  })();

  // Assign the resolved app to the global `app` variable for synchronous access later,
  // assuming initialization was successful. This part is for compatibility with how the
  // exports might be used, although direct use should be async now.
  adminPromise.then(initializedApp => {
    app = initializedApp;
  }).catch(e => {
    // The error is already logged, so we just prevent an unhandled rejection warning.
  });

} else {
  console.log('Firebase Admin SDK Initialization: App already exists.');
  app = admin.apps[0]!;
  adminPromise = Promise.resolve(app);
}

// It's better to export the initialized services rather than the raw admin object
// to ensure they are always derived from the correctly initialized app.
const getSafeDb = async () => {
  if (adminInitializationError) throw adminInitializationError;
  if (!app) await adminPromise;
  return admin.firestore();
}

const getSafeAuth = async () => {
  if (adminInitializationError) throw adminInitializationError;
  if (!app) await adminPromise;
  return admin.auth();
}


const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
export const adminApp = app;
