import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { createGroup } from './createGroup';
import { startQuestion } from './startQuestion';
import { submitAnswer } from './submitAnswer';

admin.initializeApp();

// nomes "planos", sem prefixo/objeto:
export const apiCreateGroup   = functions.https.onCall(createGroup);
export const apiStartQuestion = functions.https.onCall(startQuestion);
export const apiSubmitAnswer  = functions.https.onCall(submitAnswer);
