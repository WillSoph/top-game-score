import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { adminAuth, adminDb } from './firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const json = (statusCode: number, data: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    // Firebase ID token
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');
    if (!idToken) return json(401, { error: 'Missing Authorization' });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Buscar customerId
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const customerId = userSnap.get('stripeCustomerId') as string | undefined;
    if (!customerId) return json(400, { error: 'No Stripe customer' });

    // Criar sessão do portal
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.SITE_URL}/dashboard`,
    });

    return json(200, { url: portal.url });
  } catch (err: any) {
    console.error('portal error', err);
    return json(500, { error: 'Server error' });
  }
};
