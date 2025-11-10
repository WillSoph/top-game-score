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
    // 1) Firebase ID token
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');
    if (!idToken) return json(401, { error: 'Missing Authorization' });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // 2) Body
    const { plan = 'monthly', locale } = JSON.parse(event.body || '{}') as {
      plan?: 'monthly' | 'annual';
      locale?: string;
    };

    // 3) Pegar/criar customer
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    let customerId = userSnap.get('stripeCustomerId') as string | undefined;

    if (!customerId) {
      const user = await adminAuth.getUser(uid);
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { firebaseUID: uid },
      });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customer.id }, { merge: true });
    }

    // 4) Price
    const priceId =
      plan === 'annual'
        ? (process.env.STRIPE_PRICE_ANNUAL as string)
        : (process.env.STRIPE_PRICE_MONTHLY as string);

    // 5) Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/cancel`,
      locale: (locale as any) || undefined,
      allow_promotion_codes: true,
      subscription_data: { metadata: { firebaseUID: uid } },
      metadata: { firebaseUID: uid, plan },
    });

    return json(200, { url: session.url });
  } catch (err: any) {
    console.error('checkout error', err);
    return json(500, { error: 'Server error' });
  }
};
