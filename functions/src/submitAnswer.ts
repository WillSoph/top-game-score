import * as admin from 'firebase-admin';
export const submitAnswer = async (data: any, context: any) => {
  const uid = context.auth?.uid;
  if (!uid) throw new Error('unauthenticated');
  const { groupId, qIndex, chosenIndex } = data;
  const db = admin.firestore();
  const groupRef = db.collection('groups').doc(groupId);
  const groupSnap = await groupRef.get();
  if (!groupSnap.exists) throw new Error('not-found');
  const group = groupSnap.data()!;

  const qSnap = await groupRef.collection('questions').where('index','==',qIndex).limit(1).get();
  if (qSnap.empty) throw new Error('question-not-found');
  const q = qSnap.docs[0].data();

  const now = admin.firestore.Timestamp.now();
  const startMs = group.roundStartedAt?.toMillis?.() ?? now.toMillis();
  const elapsedMs = Math.max(0, now.toMillis() - startMs);
  const correct = chosenIndex === q.correctIndex;
  const maxMs = (group.maxTimeSec ?? 20) * 1000;
  const base = 500;
  const bonus = correct ? Math.max(0, Math.round(500 * (1 - (elapsedMs / maxMs)))) : 0;
  const scoreAwarded = correct ? base + bonus : 0;

  const answersRef = groupRef.collection('answers');
  const existing = await answersRef.where('playerId','==',uid).where('qIndex','==',qIndex).limit(1).get();
  if (!existing.empty) return { duplicate: true, scoreAwarded: existing.docs[0].data().scoreAwarded };

  await answersRef.add({
    playerId: uid,
    qIndex, chosenIndex, correct,
    elapsedMs, scoreAwarded,
    createdAt: now
  });

  await groupRef.collection('players').doc(uid).set({
    totalScore: admin.firestore.FieldValue.increment(scoreAwarded)
  }, { merge: true });

  return { scoreAwarded, correct };
};
