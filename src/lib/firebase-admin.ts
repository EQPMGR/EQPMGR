
// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

function initializeAdminApp() {
  // Only initialize if it hasn't been already.
  if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error(
        'CRITICAL: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. ' +
        'Admin SDK cannot be initialized.'
      );
    }
    
    // Explicitly initialize with the correct project ID.
    // This resolves the "Incorrect audience claim" error in development environments.
    admin.initializeApp({
      projectId: projectId,
    });
  }
  
  adminAuth = admin.auth();
  adminDb = admin.firestore();
}

// Initialize the app when the module is first loaded.
initializeAdminApp();

// Export the initialized services.
// And export functions to get them, which ensures they are initialized.
export function getAdminAuth() {
  if (!adminAuth) initializeAdminApp();
  return adminAuth;
}

export function getAdminDb() {
  if (!adminDb) initializeAdminApp();
  return adminDb;
}

// Also export the constants for direct use where appropriate.
export { adminAuth, adminDb };
