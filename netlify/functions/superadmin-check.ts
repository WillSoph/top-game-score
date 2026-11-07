import type { Handler } from '@netlify/functions';
import { adminAuth } from './lib/firebaseAdmin';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const authorization =
      event.headers.authorization ||
      event.headers.Authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authorization.slice(7).trim();

    const decodedToken = await adminAuth.verifyIdToken(token, true);

    const superadminUid = process.env.SUPERADMIN_UID;

    if (!superadminUid) {
      console.error('SUPERADMIN_UID is not configured');

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Superadmin configuration missing',
        }),
      };
    }

    if (decodedToken.uid !== superadminUid) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        authorized: true,
        uid: decodedToken.uid,
      }),
    };
  } catch (error) {
    console.error('Superadmin authentication failed:', error);

    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'Invalid or expired authentication token',
      }),
    };
  }
};