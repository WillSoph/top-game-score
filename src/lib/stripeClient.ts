// src/lib/stripeClient.ts
import { auth } from './firebase';

export async function callFn(path: string, body?: any) {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  const idToken = await u.getIdToken();

  const res = await fetch(`/.netlify/functions/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
