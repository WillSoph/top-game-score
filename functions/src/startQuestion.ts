import * as admin from 'firebase-admin';
export const startQuestion = async (data: any, context: any) => {
  const uid = context.auth?.uid;
  if (!uid) throw new Error('unauthenticated');
  const { groupId, qIndex } = data;
  const ref = admin.firestore().collection('groups').doc(groupId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('not-found');
  const g = snap.data()!;
  if (g.hostUid !== uid) throw new Error('forbidden');
  await ref.update({
    currentQuestionIndex: qIndex,
    roundStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'live'
  });
  return { ok: true };
};
