import { uploadPaymentRecord } from './upload.js';
import { readDocs } from './firestore.js';

export async function uploadPayment(payload, file, onProgress = null) {
  return uploadPaymentRecord(payload, file, onProgress);
}

export async function getPaymentsForUser(userId = null) {
  const dbUserId = userId;
  return readDocs('payments', dbUserId ? [{ field: 'studentId', operator: '==', value: dbUserId }] : []);
}
