// netlify/functions/stripe-webhook.ts
import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { adminDb } from '../../lib/firebaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const ok = (data: unknown) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const bad = (status: number, msg: string) => ({
  statusCode: status,
  body: msg,
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return bad(405, 'Method not allowed');
  }

  const sig = event.headers['stripe-signature'] as string;
  if (!sig) return bad(400, 'Missing stripe-signature');

  // Corpo RAW (string); se vier base64, decodifica.
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error('Webhook signature failed:', err?.message);
    return bad(400, `Webhook Error: ${err?.message}`);
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;

        // Tenta UID via metadata; se não, resolve por customer -> users
        let uid = (session.metadata?.firebaseUID as string | undefined) || undefined;

        if (!uid && session.customer) {
          const custId = session.customer as string;
          const q = await adminDb
            .collection('users')
            .where('stripeCustomerId', '==', custId)
            .limit(1)
            .get();
          if (!q.empty) uid = q.docs[0].id;
        }

        if (uid && session.subscription) {
          // TS friendly: garanta o tipo e faça guard do campo
          const sub = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as Stripe.Subscription;

          const currentPeriodEnd =
            // alguns ambientes/tipos podem “ocultar” o campo; faça guard
            (sub as any).current_period_end ??
            null;

          await adminDb.collection('users').doc(uid).set(
            {
              plan: 'pro',
              active: true,
              subscriptionId: sub.id,
              currentPeriodEnd,       // number | null (epoch seconds)
              canceledAt: null,
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        const custId = sub.customer as string;

        const q = await adminDb
          .collection('users')
          .where('stripeCustomerId', '==', custId)
          .limit(1)
          .get();

        if (!q.empty) {
          const uid = q.docs[0].id;
          const active = sub.status === 'active' || sub.status === 'trialing';

          const currentPeriodEnd =
            (sub as any).current_period_end ?? null;

          await adminDb.collection('users').doc(uid).set(
            {
              plan: active ? 'pro' : 'free',
              active,
              subscriptionId: sub.id,
              currentPeriodEnd,       // number | null
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription;
        const custId = sub.customer as string;

        const q = await adminDb
          .collection('users')
          .where('stripeCustomerId', '==', custId)
          .limit(1)
          .get();

        if (!q.empty) {
          const uid = q.docs[0].id;

          const canceledAt =
            (sub as any).canceled_at ??
            Math.floor(Date.now() / 1000);

          await adminDb.collection('users').doc(uid).set(
            {
              plan: 'free',
              active: false,
              subscriptionId: null,
              canceledAt,            // number (epoch seconds)
              currentPeriodEnd: null,
            },
            { merge: true }
          );
        }
        break;
      }

      default:
        // outros eventos não tratados
        break;
    }

    return ok({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return bad(500, 'Server error');
  }
};
