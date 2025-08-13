
'use server';

import 'dotenv/config';
import * as admin from 'firebase-admin';

let app: admin.app.App;

function getAdminApp() {
    if (!admin.apps.length) {
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      app = admin.app();
    }
    return app;
}

// Export functions that return the initialized services.
// This is required for compatibility with Next.js "use server".
export async function getAdminAuth() {
    return admin.auth(getAdminApp());
}

export async function getAdminDb() {
  return admin.firestore(getAdminApp());
}

// Re-exporting the app instance itself for any cases that need it directly.
export { getAdminApp as adminApp };
