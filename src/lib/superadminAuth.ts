// src/lib/superadminAuth.ts
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';

import { app } from './firebase';

const adminApp =
  getApps().find((firebaseApp) => firebaseApp.name === 'topgamescore-superadmin') ??
  initializeApp(app.options, 'topgamescore-superadmin');

export const superadminAuth = getAuth(adminApp);

export async function prepareSuperadminAuth() {
  await setPersistence(
    superadminAuth,
    browserSessionPersistence
  );

  return superadminAuth;
}

export async function checkSuperadminAccess(): Promise<boolean> {
  const user = superadminAuth.currentUser;

  if (!user) return false;

  const token = await user.getIdToken();

  const response = await fetch('/.netlify/functions/superadmin-check', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return false;

  const result = await response.json();

  return result.authorized === true;
}