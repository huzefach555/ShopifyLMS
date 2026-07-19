import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp, runTransaction, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';
import { uploadToCloudinary } from './cloudinary.js';

let app;
let auth;
let db;
let storage;

export async function initializeFirebase() {
  if (app) return app;
  const config = firebaseConfig;
  if (!config.apiKey || config.apiKey.includes('YOUR_')) {
    throw new Error('Firebase configuration is missing.');
  }
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  return app;
}

export async function getFirebaseAuth() {
  if (!auth) await initializeFirebase();
  return auth;
}

export async function getFirebaseDb() {
  if (!db) await initializeFirebase();
  return db;
}

export async function getFirebaseStorage() {
  if (!storage) await initializeFirebase();
  return storage;
}

export async function signIn(email, password) {
  const authInstance = await getFirebaseAuth();
  const safeEmail = typeof email === 'string' ? email.trim() : String(email || '');
  const safePassword = typeof password === 'string' ? password : String(password || '');
  return signInWithEmailAndPassword(authInstance, safeEmail, safePassword);
}

export async function signOut() {
  const authInstance = await getFirebaseAuth();
  return firebaseSignOut(authInstance);
}

export async function generateRollNumber() {
  const dbInstance = await getFirebaseDb();
  const counterRef = doc(dbInstance, 'counters', 'rollNumber');
  
  try {
    const rollNumber = await runTransaction(dbInstance, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextNumber = 1;
      
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data().lastNumber || 0) + 1;
      }
      
      transaction.set(counterRef, { lastNumber: nextNumber });
      
      // Format as DSA-XXXX with leading zeros
      const formattedNumber = String(nextNumber).padStart(4, '0');
      return `DSA-${formattedNumber}`;
    });
    
    return rollNumber;
  } catch (error) {
    console.error('Error generating roll number:', error);
    // Fallback to timestamp-based if transaction fails
    const timestamp = Date.now().toString().slice(-4);
    return `DSA-${timestamp}`;
  }
}

export async function registerStudent(payload, file) {
  const authInstance = await getFirebaseAuth();
  const dbInstance = await getFirebaseDb();
  const userCredential = await createUserWithEmailAndPassword(authInstance, payload.email, payload.password);
  const user = userCredential.user;
  await updateProfile(user, { displayName: payload.fullName });
  
  // Generate unique roll number
  const rollNumber = await generateRollNumber();
  
  let photoURL = '';
  if (file && file.name) {
    try {
      const response = await uploadToCloudinary(file, `students/${user.uid}`);
      photoURL = response.secure_url || '';
    } catch (err) {
      // Photo upload failed, continue without photo
    }
  }
  const sanitized = { ...payload };
  delete sanitized.password;
  delete sanitized.confirmPassword;
  const student = {
    ...sanitized,
    uid: user.uid,
    rollNumber,
    photoURL,
    role: 'student',
    approvalStatus: 'pending',
    createdAt: serverTimestamp()
  };
  try {
    await setDoc(doc(dbInstance, 'students', user.uid), student);
  } catch (err) {
    throw err;
  }
  return { user, student };
}
