// netlify/functions/lib/firebaseAdmin.ts
import admin from 'firebase-admin';

type SA = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): SA {
  // Opção A: tudo em uma env JSON (recomendado)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    const parsed = JSON.parse(json);
    // protege contra chaves com \n literais
    if (parsed.private_key) parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    return parsed;
  }

  // Opção B: envs separadas
  const project_id = process.env.FIREBASE_PROJECT_ID;
  const client_email = process.env.FIREBASE_CLIENT_EMAIL;
  const private_key = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!project_id || !client_email || !private_key) {
    throw new Error(
      'Missing Firebase Admin envs. Provide FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.'
    );
  }
  return { project_id, client_email, private_key };
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
