
'use server';

import 'dotenv/config';
import * as admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} else {
  app = admin.app();
}

const adminDb = admin.firestore(app);
const adminAuth = admin.auth(app);

export { adminDb, adminAuth, app as adminApp };
