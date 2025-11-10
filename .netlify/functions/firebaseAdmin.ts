// Inicializa Firebase Admin em ambiente serverless (Vercel/Netlify)
import * as admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
  // Use UM dos formatos abaixo. Recomendo BASE64 do service account.
  const svcBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (svcBase64) {
    const json = JSON.parse(Buffer.from(svcBase64, 'base64').toString('utf-8'));
    app = admin.initializeApp({
      credential: admin.credential.cert(json),
    });
  } else {
    // Alternativa: variáveis individuais
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb   = admin.firestore();
