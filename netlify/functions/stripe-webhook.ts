// netlify/functions/stripe-webhook.ts
import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { adminDb } from './lib/firebaseAdmin';

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

  /** ------------------------------------------
   * Função auxiliar: atualizar todos os grupos
   * -----------------------------------------*/
  async function updateGroupsForUser(uid: string, isPro: boolean) {
    const groupsSnap = await adminDb
      .collection("groups")
      .where("hostUid", "==", uid)
      .get();

    const batch = adminDb.batch();

    groupsSnap.forEach((docRef) => {
      const ref = adminDb.collection("groups").doc(docRef.id);
      if (isPro) {
        // PRO → SEM expiração
        batch.set(ref, { plan: "pro", expiresAt: null }, { merge: true });
      } else {
        // FREE → expira em 7 dias
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        batch.set(ref, { plan: "free", expiresAt }, { merge: true });
      }
    });

    await batch.commit();
  }

  /** ------------------------------------------
   * Webhook handler
   * -----------------------------------------*/
  try {
    switch (stripeEvent.type) {

      /** ============================================================
       * CHECKOUT CONCLUÍDO → ASSINAÇÃO CRIADA
       * ============================================================*/
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;

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
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const currentPeriodEnd = (sub as any).current_period_end ?? null;

          // Atualiza usuário
          await adminDb.collection('users').doc(uid).set(
            {
              plan: 'pro',
              active: true,
              subscriptionId: sub.id,
              currentPeriodEnd,
              canceledAt: null,
            },
            { merge: true }
          );

          // Atualiza grupos → PRO = sem expiração
          await updateGroupsForUser(uid, true);
        }
        break;
      }

      /** ============================================================
       * ASSINATURA ATUALIZADA
       * ============================================================*/
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
          const isPro = active;

          const currentPeriodEnd = (sub as any).current_period_end ?? null;

          await adminDb.collection('users').doc(uid).set(
            {
              plan: isPro ? 'pro' : 'free',
              active: isPro,
              subscriptionId: sub.id,
              currentPeriodEnd,
            },
            { merge: true }
          );

          await updateGroupsForUser(uid, isPro);
        }
        break;
      }

      /** ============================================================
       * ASSINATURA CANCELADA
       * ============================================================*/
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
            (sub as any).canceled_at ?? Math.floor(Date.now() / 1000);

          await adminDb.collection('users').doc(uid).set(
            {
              plan: 'free',
              active: false,
              subscriptionId: null,
              canceledAt,
              currentPeriodEnd: null,
            },
            { merge: true }
          );

          // Voltou para FREE → recoloca expiração de 7 dias
          await updateGroupsForUser(uid, false);
        }
        break;
      }

      default:
        break;
    }

    return ok({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return bad(500, 'Server error');
  }
};
