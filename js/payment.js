// import { uploadPaymentRecord } from './upload.js';
// import { readDocs } from './firestore.js';

// export async function uploadPayment(payload, file, onProgress = null) {
//   return uploadPaymentRecord(payload, file, onProgress);
// }

// export async function getPaymentsForUser(userId = null) {
//   const dbUserId = userId;
//   return readDocs('payments', dbUserId ? [{ field: 'studentId', operator: '==', value: dbUserId }] : []);
// }

import { uploadPaymentRecord } from './upload.js';
import { readDocs } from './firestore.js';

export async function uploadPayment(payload, file, onProgress = null) {
    try {
        const result = await uploadPaymentRecord(payload, file, onProgress);
        return result;
    } catch (err) {
        throw err;
    }
}

export async function getPaymentsForUser(userId = null) {
    return await readDocs(
        'payments',
        userId ? [{ field: 'studentId', operator: '==', value: userId }] : []
    );
}