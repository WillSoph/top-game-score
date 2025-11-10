import Stripe from 'stripe';
import { adminAuth, adminDb } from './firebaseAdmin';

/**
 * Redireciona o usuário logado para o portal de gerenciamento de assinatura (Stripe Customer Portal)
 * Usado quando o usuário já é Pro e quer alterar ou cancelar o plano.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');
    if (!idToken)
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization' }) };

    // Verifica token Firebase
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Busca o customerId no Firestore (salvo no checkout-create)
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const customerId = userSnap.get('stripeCustomerId');

    if (!customerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Customer not found' }) };
    }

    // Cria sessão do portal
    const body = event.body ? JSON.parse(event.body) : {};
    const returnUrl = body.returnUrl || process.env.SITE_URL;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('customer-portal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
