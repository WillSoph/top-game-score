
import type { Handler } from '@netlify/functions';
import { adminAuth, adminDb } from './lib/firebaseAdmin';
import type { UserRecord } from 'firebase-admin/auth';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  },
  body: JSON.stringify(body),
});

type RecentUser = {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Pro';
  createdAt: string;
};

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

    return json(500, {
      error: 'Server configuration error',
    });
  }

  try {
    const token = authorization.slice(7).trim();

    const decoded = await adminAuth.verifyIdToken(token, true);

    if (decoded.uid !== superadminUid) {
      return json(403, { error: 'Forbidden' });
    }

    // 1. Buscar usuários cadastrados no Firebase Auth
    const registeredUsers: UserRecord[] = [];

    let nextPageToken: string | undefined;

    do {
      const result = await adminAuth.listUsers(
        1000,
        nextPageToken
      );

      for (const user of result.users) {
        // Ignora contas exclusivamente anônimas
        if (user.email || user.providerData.length > 0) {
          registeredUsers.push(user);
        }
      }

      nextPageToken = result.pageToken;
    } while (nextPageToken);

    const usersCount = registeredUsers.length;

    // 2. Ordenar por data de cadastro (mais recentes primeiro)
    registeredUsers.sort((a, b) => {
      const dateA = new Date(a.metadata.creationTime).getTime();
      const dateB = new Date(b.metadata.creationTime).getTime();

      return dateB - dateA;
    });

    // 3. Selecionar os 5 cadastros mais recentes
    const latestUsers = registeredUsers.slice(0, 5);

    // 4. Consultar os planos no Firestore
    const recentUsers: RecentUser[] = await Promise.all(
      latestUsers.map(async (user) => {
        const userDoc = await adminDb
          .collection('users')
          .doc(user.uid)
          .get();

        const data = userDoc.data();

        const isPro =
          data?.plan === 'pro' &&
          data?.active === true;

        return {
          id: user.uid,
          name: user.displayName || 'Sem nome',
          email: user.email || 'Não informado',
          plan: isPro ? 'Pro' : 'Free',
          createdAt: user.metadata.creationTime,
        };
      })
    );

    // 5. Contar assinantes Pro ativos
    const proSnap = await adminDb
      .collection('users')
      .where('plan', '==', 'pro')
      .where('active', '==', true)
      .count()
      .get();

    const proUsers = proSnap.data().count;

    // 6. Contar quizzes existentes
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
      recentUsers,
    });
  } catch (error) {
    console.error('Superadmin overview error:', error);

    return json(500, {
      error: 'Could not load dashboard overview',
    });
  }
};
