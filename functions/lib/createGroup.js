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
exports.createGroup = void 0;
const admin = __importStar(require("firebase-admin"));
const createGroup = async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new Error('unauthenticated');
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);
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
exports.createGroup = createGroup;
//# sourceMappingURL=createGroup.js.map