// netlify/functions/checkout-create.ts
import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { adminAuth, adminDb } from './lib/firebaseAdmin';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error('❌ STRIPE_SECRET_KEY is missing in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const ok = (data: unknown) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const bad = (status: number, msg: string) => ({
  statusCode: status,
  headers: { 'Content-Type': 'text/plain' },
  body: msg,
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return bad(405, 'Method not allowed');
    }

    if (!stripe || !secretKey) {
      return bad(500, 'Stripe not configured (missing STRIPE_SECRET_KEY)');
    }

    if (!event.headers.authorization?.startsWith('Bearer ')) {
      return bad(401, 'Missing Firebase ID token');
    }

    const idToken = event.headers.authorization.slice('Bearer '.length).trim();

    // valida usuário
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? 'no-email';

    const body = JSON.parse(event.body || '{}') as { plan?: 'monthly' | 'annual'; locale?: string };
    const plan = body.plan ?? 'monthly';

    const priceMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const priceAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL;

    const priceId =
      plan === 'annual'
        ? priceAnnual
        : priceMonthly;

    if (!priceId) {
      return bad(
        500,
        `Missing Stripe price env for plan=${plan}. ` +
          `Check STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_ANNUAL.`
      );
    }

    // pega ou cria customer
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    let stripeCustomerId = userSnap.data()?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUID: uid },
      });
      stripeCustomerId = customer.id;
      await userRef.set({ stripeCustomerId }, { merge: true });
    }

    const successUrl = `${process.env.SITE_URL ?? 'https://topgamescore.com'}/success`;
    const cancelUrl = `${process.env.SITE_URL ?? 'https://topgamescore.com'}/dashboard`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUID: uid,
        locale: body.locale ?? 'en',
      },
    });

    return ok({ url: session.url });
  } catch (err: any) {
    console.error('❌ checkout-create error:', err?.message || err, err?.stack);
    return bad(500, `Server error: ${err?.message || 'unknown'}`);
  }
};
