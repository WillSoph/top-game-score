
import type { Handler } from '@netlify/functions';
import { adminAuth, adminDb } from './lib/firebaseAdmin';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const authorization =
    event.headers.authorization ||
    event.headers.Authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return json(401, { error: 'Unauthorized' });
  }

  const superadminUid = process.env.SUPERADMIN_UID;

  if (!superadminUid) {
    console.error('SUPERADMIN_UID is not configured');
    return json(500, { error: 'Server configuration error' });
  }

  try {
    const token = authorization.slice(7).trim();
    const decoded = await adminAuth.verifyIdToken(token, true);

    if (decoded.uid !== superadminUid) {
      return json(403, { error: 'Forbidden' });
    }

    // Total de contas cadastradas no Firebase Authentication.
    // Ignora contas exclusivamente anônimas.
    let usersCount = 0;
    let nextPageToken: string | undefined;

    do {
      const result = await adminAuth.listUsers(1000, nextPageToken);

      for (const user of result.users) {
        if (user.providerData.length > 0 || user.email) {
          usersCount++;
        }
      }

      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Assinantes Pro ativos
    const proSnap = await adminDb
      .collection('users')
      .where('plan', '==', 'pro')
      .where('active', '==', true)
      .count()
      .get();

    const proUsers = proSnap.data().count;

    // Total de quizzes/grupos criados
    const groupsSnap = await adminDb
      .collection('groups')
      .count()
      .get();

    const quizzes = groupsSnap.data().count;

    return json(200, {
      users: usersCount,
      proUsers,
      quizzes,
      aiQuizzes: null,
    });
  } catch (error) {
    console.error('Superadmin overview error:', error);

    return json(500, {
      error: 'Could not load dashboard overview',
    });
  }
};
