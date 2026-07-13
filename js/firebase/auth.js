import { initializeApp as initFirebase } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth as getFirebaseAuth, onAuthStateChanged as onAuthChange, signInWithEmailAndPassword as signIn, createUserWithEmailAndPassword as signUp, signOut as signOutUser } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { firebaseConfig } from './config.js';

let app;
let auth;

export function initializeApp() {
  if (!app) {
    app = initFirebase(firebaseConfig);
  }
  if (!auth) {
    auth = getFirebaseAuth(app);
  }
  return app;
}

export function getAuth() {
  if (!auth) initializeApp();
  return auth;
}

export function onAuthStateChanged(authInstance, callback) {
  return onAuthChange(authInstance, callback);
}

export function signInWithEmailAndPassword(authInstance, email, password) {
  return signIn(authInstance, email, password);
}

export function createUserWithEmailAndPassword(authInstance, email, password) {
  return signUp(authInstance, email, password);
}

export function signOut(authInstance) {
  return signOutUser(authInstance);
}
