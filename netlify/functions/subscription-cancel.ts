import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// 🔐 Inicialização do Firebase Admin com service account da env var
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    // forçamos o projectId pra evitar exatamente esse erro
    projectId: serviceAccount.project_id,
  });
}

// Inicializa Stripe com a secret key do backend
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1) Pega e valida o Firebase ID token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Missing or invalid Authorization header' };
    }

    const idToken = authHeader.replace('Bearer ', '').trim();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'User has no email' }),
      };
    }

    console.log('[subscription-cancel] uid:', decoded.uid, 'email:', email);

    // 2) Acha o customer no Stripe pelo email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (!customers.data.length) {
      console.log('[subscription-cancel] No Stripe customer for email', email);
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'No Stripe customer for this email' }),
      };
    }

    const customer = customers.data[0];
    console.log('[subscription-cancel] customer.id:', customer.id);

    // 3) Lista assinaturas do customer e pega uma ativa/trialing
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 10,
    });

    const activeSub = subs.data.find(
      (s) => s.status === 'active' || s.status === 'trialing'
    );

    if (!activeSub) {
      console.log('[subscription-cancel] No active/trialing subscription found');
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'No active subscription to cancel' }),
      };
    }

    console.log('[subscription-cancel] cancel subscription id:', activeSub.id);

    // 4) Marca para cancelar ao fim do período
    const updated = await stripe.subscriptions.update(activeSub.id, {
  cancel_at_period_end: true,
});

const currentPeriodEnd = (updated as any).current_period_end ?? null;
    console.log(
      '[subscription-cancel] cancel_at_period_end set. current_period_end:',
      currentPeriodEnd
    );

    // 5) Resposta JSON para o front
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        current_period_end: currentPeriodEnd,
      }),
    };
  } catch (err: any) {
    console.error('[subscription-cancel] ERROR:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err?.message || 'Failed to cancel subscription',
      }),
    };
  }
};
