import Stripe from 'stripe';
import { adminAuth, adminDb } from '../../lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const handler = async (event: any) => {
  // CORS / Preflight
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
    if (!idToken) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = event.body ? JSON.parse(event.body) : {};
    const plan = (body.plan as 'monthly'|'annual') || 'monthly';
    const locale = body.locale as string | undefined;

    // Pegar/criar customer
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

    const priceId =
      plan === 'annual'
        ? (process.env.STRIPE_PRICE_ANNUAL as string)
        : (process.env.STRIPE_PRICE_MONTHLY as string);

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

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('checkout-create error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
