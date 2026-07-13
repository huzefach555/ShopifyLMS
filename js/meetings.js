import { createDoc, deleteDocById, readDocs, updateDocById } from './firestore.js';
import { getFirebaseAuth } from './firebase.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export async function fetchMeetingLinks() {
  const links = await readDocs('meetingLinks');
  return links.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function saveMeetingLink(payload) {
  const auth = await getFirebaseAuth();
  if (!auth.currentUser) throw new Error('Please sign in.');
  const linkData = {
    title: payload.title || 'Meeting',
    platform: payload.platform || 'Google Meet',
    url: payload.url || '',
    courseType: payload.courseType || 'online',
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp()
  };
  if (payload.id) {
    await updateDocById('meetingLinks', payload.id, linkData);
    return { id: payload.id, ...linkData };
  }
  const created = await createDoc('meetingLinks', linkData);
  return { id: created.id, ...linkData };
}

export async function deleteMeetingLink(id) {
  return deleteDocById('meetingLinks', id);
}

export async function fetchVisibleMeetingLink(studentId) {
  const links = await fetchMeetingLinks();
  const student = await (await import('./firestore.js')).readDoc('students', studentId);
  if (!student || student.learningMode !== 'Online') return null;
  return links[0] || null;
}
