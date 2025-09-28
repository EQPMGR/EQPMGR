// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

function initializeAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
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
