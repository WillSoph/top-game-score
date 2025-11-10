import Stripe from 'stripe';
import { adminAuth, adminDb } from '../../lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');
    if (!idToken) return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const customerId = userSnap.get('stripeCustomerId');

    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Customer not found' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const returnUrl = body.returnUrl || process.env.SITE_URL;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('customer-portal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
