// netlify/functions/lib/firebaseAdmin.ts
import admin from 'firebase-admin';

type SA = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): SA {
  const project_id = process.env.FIREBASE_PROJECT_ID;
  const client_email = process.env.FIREBASE_CLIENT_EMAIL;
  const private_key_raw = process.env.FIREBASE_PRIVATE_KEY;

  if (!project_id || !client_email || !private_key_raw) {
    throw new Error(
      'Missing Firebase Admin envs. Expected FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.'
    );
  }

  // Corrige quebra de linha para ambiente Netlify/Vercel
  const private_key = private_key_raw.replace(/\\n/g, '\n');

  return {
    project_id,
    client_email,
    private_key,
  };
}

const sa = getServiceAccount();

// Evita re-init em hot reload local
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
