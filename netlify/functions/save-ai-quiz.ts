import type { Handler } from '@netlify/functions';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { adminAuth, adminDb } from './lib/firebaseAdmin';

const respond = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Método não permitido.' });
  const bearer = event.headers.authorization || event.headers.Authorization || '';
  if (!bearer.startsWith('Bearer ')) return respond(401, { error: 'Autenticação necessária.' });

  let uid: string;
  try {
    const token = await adminAuth.verifyIdToken(bearer.slice(7).trim(), true);
    if (token.firebase.sign_in_provider === 'anonymous') return respond(403, { error: 'Entre com uma conta Pro.' });
    uid = token.uid;
  } catch {
    return respond(401, { error: 'Sessão inválida ou expirada.' });
  }

  let input: unknown;
  try { input = JSON.parse(event.body || ''); } catch { return respond(400, { error: 'JSON inválido.' }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return respond(400, { error: 'Dados inválidos.' });
  const { generationId, maxTimeSec } = input as Record<string, unknown>;
  if (typeof generationId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(generationId) ||
      typeof maxTimeSec !== 'number' || !Number.isInteger(maxTimeSec) || maxTimeSec < 5 || maxTimeSec > 300) {
    return respond(400, { error: 'Identificador ou tempo inválido.' });
  }

  const userRef = adminDb.collection('users').doc(uid);
  const generationRef = userRef.collection('aiGenerations').doc(generationId);
  // Identificador estável: repetir a mesma solicitação nunca cria um segundo grupo.
  const groupId = 'ai_' + createHash('sha256').update(`${uid}:${generationId}`).digest('hex').slice(0, 40);
  const groupRef = adminDb.collection('groups').doc(groupId);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // Todas as leituras devem ocorrer antes de qualquer escrita.
      const [userSnap, generationSnap, groupSnap] = await Promise.all([
        tx.get(userRef), tx.get(generationRef), tx.get(groupRef),
      ]);
      const generation = generationSnap.data();
      if (!generationSnap.exists || !generation) throw new Error('NOT_FOUND');
      if (generation.savedGroupId && generation.savedGroupId !== groupId) throw new Error('CONFLICT');
      if (groupSnap.exists) {
        if (groupSnap.data()?.hostUid !== uid || groupSnap.data()?.creationMethod !== 'ai' || groupSnap.data()?.generationId !== generationId) throw new Error('CONFLICT');
        return { groupId, reused: true };
      }
      if (userSnap.data()?.plan !== 'pro' || userSnap.data()?.active !== true) throw new Error('NOT_PRO');
      if (generation.status !== 'generated' && generation.status !== 'saved') throw new Error('NOT_FOUND');

      const quiz = generation.quiz;
      if (!quiz || typeof quiz.title !== 'string' || !quiz.title.trim() || quiz.title.length > 160 ||
          !Array.isArray(quiz.questions) || quiz.questions.length < 1 || quiz.questions.length > 30) throw new Error('INVALID_QUIZ');
      for (const question of quiz.questions) {
        if (!question || typeof question.text !== 'string' || !question.text.trim() || question.text.length > 500 ||
            !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5 ||
            !question.options.every((option: unknown) => typeof option === 'string' && !!option.trim() && option.length <= 240) ||
            !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length) {
          throw new Error('INVALID_QUIZ');
        }
      }
      if (!['pt', 'en', 'es'].includes(generation.language)) throw new Error('INVALID_QUIZ');

      const authUser = await adminAuth.getUser(uid);
      const hostEmail = authUser.email ?? null;
      const hostName = authUser.displayName || (hostEmail ? hostEmail.split('@')[0] : null);
      tx.create(groupRef, {
        hostUid: uid,
        hostName,
        hostEmail,
        code: groupId,
        title: quiz.title.trim(),
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: null,
        status: 'draft',
        currentQuestionIndex: -1,
        questionCount: quiz.questions.length,
        roundStartedAt: null,
        maxTimeSec,
        locale: generation.language,
        plan: 'pro',
        creationMethod: 'ai',
        generationId,
      });
      quiz.questions.forEach((question: { text: string; options: string[]; correctIndex: number }, index: number) => {
        tx.create(groupRef.collection('questions').doc(`q_${String(index).padStart(3, '0')}`), {
          text: question.text,
          options: question.options,
          correctIndex: question.correctIndex,
          index,
        });
      });
      tx.update(generationRef, { savedGroupId: groupId, status: 'saved', savedAt: FieldValue.serverTimestamp() });
      return { groupId, reused: false };
    });
    return respond(200, result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') return respond(404, { error: 'Geração não encontrada.' });
      if (error.message === 'NOT_PRO') return respond(403, { error: 'É necessária uma assinatura Pro ativa para salvar.' });
      if (error.message === 'INVALID_QUIZ') return respond(422, { error: 'Quiz armazenado inválido.' });
      if (error.message === 'CONFLICT') return respond(409, { error: 'Conflito ao salvar a geração.' });
    }
    console.error('save-ai-quiz failed:', error);
    return respond(500, { error: 'Não foi possível salvar o quiz. Tente novamente.' });
  }
};
