import { getFirebaseDb } from './firebase.js';
import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const collections = {
  students: 'students',
  teachers: 'teachers',
  admins: 'admins',
  tasks: 'tasks',
  progress: 'progress',
  announcements: 'announcements',
  payments: 'payments',
  meetingLinks: 'meetingLinks',
  resources: 'resources',
  assignments: 'assignments',
  courses: 'courses'
};

function getCollectionRef(name) {
  return collection(getFirebaseDb(), collections[name]);
}

function getDocRef(name, id) {
  return doc(getFirebaseDb(), collections[name], id);
}

export async function createDoc(collectionName, data) {
  const db = await getFirebaseDb();
  const ref = collection(db, collections[collectionName]);
  return addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

export async function readDocs(collectionName, filters = []) {
  try {
    const db = await getFirebaseDb();
    let q = query(collection(db, collections[collectionName]), orderBy('createdAt', 'desc'));
    filters.forEach((filter) => {
      q = query(q, where(filter.field, filter.operator, filter.value));
    });
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    // Return empty array if collection doesn't exist or query fails
    return [];
  }
}

export async function listenDocs(collectionName, filters = [], callback) {
  try {
    const db = await getFirebaseDb();
    let q = query(collection(db, collections[collectionName]), orderBy('createdAt', 'desc'));
    filters.forEach((filter) => {
      q = query(q, where(filter.field, filter.operator || filter.op, filter.value));
    });
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      try { callback(docs); } catch (err) {}
    }, (err) => {
      // Silently handle errors (collection doesn't exist, permission denied, etc.)
    });
    return unsubscribe;
  } catch (err) {
    // Return a no-op unsubscribe function if listener setup fails
    return () => {};
  }
}

export async function readDoc(collectionName, id) {
  try {
    const db = await getFirebaseDb();
    const snap = await getDoc(doc(db, collections[collectionName], id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    return null;
  }
}

export async function updateDocById(collectionName, id, data) {
  const db = await getFirebaseDb();
  await updateDoc(doc(db, collections[collectionName], id), data);
  return true;
}

export async function deleteDocById(collectionName, id) {
  const db = await getFirebaseDb();
  await deleteDoc(doc(db, collections[collectionName], id));
  return true;
}

export { collections };
