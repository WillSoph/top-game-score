import * as admin from 'firebase-admin';
export const createGroup = async (data: any, context: any) => {
  const uid = context.auth?.uid;
  if (!uid) throw new Error('unauthenticated');
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7*24*60*60*1000);
  const ref = await admin.firestore().collection('groups').add({
    hostUid: uid,
    code: '',
    title: data?.title ?? 'Quiz',
    createdAt: now,
    expiresAt,
    status: 'draft',
    currentQuestionIndex: -1,
    questionCount: 0,
    roundStartedAt: null,
    maxTimeSec: data?.maxTimeSec ?? 20,
    locale: data?.locale ?? 'en'
  });
  await ref.update({ code: ref.id });
  return { groupId: ref.id, code: ref.id };
};
