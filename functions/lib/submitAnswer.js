"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAnswer = void 0;
const admin = __importStar(require("firebase-admin"));
const submitAnswer = async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new Error('unauthenticated');
    const { groupId, qIndex, chosenIndex } = data;
    const db = admin.firestore();
    const groupRef = db.collection('groups').doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists)
        throw new Error('not-found');
    const group = groupSnap.data();
    const qSnap = await groupRef.collection('questions').where('index', '==', qIndex).limit(1).get();
    if (qSnap.empty)
        throw new Error('question-not-found');
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
    const existing = await answersRef.where('playerId', '==', uid).where('qIndex', '==', qIndex).limit(1).get();
    if (!existing.empty)
        return { duplicate: true, scoreAwarded: existing.docs[0].data().scoreAwarded };
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
exports.submitAnswer = submitAnswer;
//# sourceMappingURL=submitAnswer.js.map