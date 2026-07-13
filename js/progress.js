import { createDoc, readDocs, updateDocById } from './firestore.js';
import { getFirebaseAuth } from './firebase.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export async function fetchProgressRecords() {
  const records = await readDocs('progress');
  return records.sort((a, b) => (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0));
}

export async function fetchStudentProgress(studentId) {
  const records = await fetchProgressRecords();
  return records.find((record) => record.studentId === studentId) || null;
}

export async function saveStudentProgress(payload) {
  const auth = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('Please sign in.');
  const existing = await fetchStudentProgress(payload.studentId);
  const progressData = {
    studentId: payload.studentId,
    studentName: payload.studentName || '',
    percentage: Number(payload.percentage) || 0,
    remarks: payload.remarks || '',
    teacherId: auth.currentUser.uid,
    updatedAt: serverTimestamp()
  };
  if (existing?.id) {
    await updateDocById('progress', existing.id, progressData);
    return { id: existing.id, ...progressData };
  }
  const created = await createDoc('progress', progressData);
  return { id: created.id, ...progressData };
}
