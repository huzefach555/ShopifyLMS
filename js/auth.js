import { initializeFirebase, getFirebaseAuth, signIn, signOut, registerStudent } from './firebase.js';
import { onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { readDoc } from './firestore.js';

let currentUser = null;
let currentRole = 'guest';
let currentApprovalStatus = null;
let authReady = false;
let authPromise = null;

export function getAuthState() {
  return { user: currentUser, role: currentRole, approvalStatus: currentApprovalStatus };
}

async function syncAccessState(user, requestedRole = null) {
  if (!user) {
    currentRole = 'guest';
    currentApprovalStatus = null;
    localStorage.removeItem('approvalStatus');
    return;
  }
  const fallbackRole = requestedRole || localStorage.getItem('role') || 'student';
  let role = fallbackRole;
  const roleCollections = { student: 'students', teacher: 'teachers', admin: 'admins' };
  const roleDoc = await readDoc(roleCollections[role] || 'students', user.uid);
  if (roleDoc) role = roleDoc.role || role;
  currentRole = role;
  localStorage.setItem('role', role);
  if (role === 'student') {
    const student = await readDoc('students', user.uid);
    currentApprovalStatus = student?.approvalStatus || 'pending';
    localStorage.setItem('approvalStatus', currentApprovalStatus);
    return;
  }
  currentApprovalStatus = 'approved';
  localStorage.setItem('approvalStatus', 'approved');
}

export async function initAuth() {
  if (authReady) return;
  if (!authPromise) {
    authPromise = (async () => {
      await initializeFirebase();
      const auth = await getFirebaseAuth();
      await new Promise((resolve) => {
        let settled = false;
        onAuthStateChanged(auth, async (user) => {
          if (authReady && currentUser?.uid === user?.uid) {
            resolve();
            return;
          }
          currentUser = user;
          await syncAccessState(user, localStorage.getItem('role'));
          if (!settled) {
            settled = true;
            authReady = true;
            resolve();
          }
        });
      });
    })();
  }
  return authPromise;
}

export async function authSignup(payload, file) {
  const result = await registerStudent(payload, file);
  localStorage.setItem('role', 'student');
  currentRole = 'student';
  currentApprovalStatus = 'pending';
  return result;
}

export async function authLogin(email, password, role) {
  const authInstance = await getFirebaseAuth();
  await signIn(authInstance, email, password);
  localStorage.setItem('role', role);
  currentRole = role;
  await syncAccessState((await getFirebaseAuth()).currentUser, role);
  return getAuthState();
}

export async function authLogout() {
  await signOut(await getFirebaseAuth());
  localStorage.removeItem('role');
  localStorage.removeItem('approvalStatus');
  currentRole = 'guest';
  currentUser = null;
  currentApprovalStatus = null;
}

export async function resetPassword(email) {
  const authInstance = await getFirebaseAuth();
  return sendPasswordResetEmail(authInstance, email);
}

export function requireAuth(role = null) {
  const state = getAuthState();
  const approvalStatus = state.approvalStatus || localStorage.getItem('approvalStatus');
  if (!state.user) {
    window.location.href = './index.html';
    return false;
  }
  if (role && state.role !== role) {
    window.location.href = './index.html';
    return false;
  }
  if (role === 'student' && approvalStatus !== 'approved') {
    window.location.href = './login.html?status=blocked';
    return false;
  }
  return true;
}
