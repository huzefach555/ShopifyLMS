import { initializeFirebase, getFirebaseAuth, signOut, registerStudent } from './firebase.js';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { readDoc } from './firestore.js';

const KNOWN_ADMIN_EMAILS = [
  'shopifylma123@gmail.com' // Add admin account email addresses here.
];

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
  // Determine role by checking authoritative role collections in Firestore.
  // Do not trust client-provided role values.
  let role = 'guest';
  const normalizedEmail = String(user.email || '').toLowerCase().trim();

  try {
    const adminDoc = await readDoc('admins', user.uid);
    if (adminDoc) {
      role = 'admin';
    }
  } catch (e) {
    // Ignore permission errors when checking admin UID path.
  }

  if (role === 'guest' && KNOWN_ADMIN_EMAILS.includes(normalizedEmail)) {
    role = 'admin';
  }

  if (role === 'guest') {
    try {
      const teacherDoc = await readDoc('teachers', user.uid);
      if (teacherDoc) role = 'teacher';
    } catch (e) {
      // Ignore missing/permission failures for teacher lookup.
    }
  }

  if (role === 'guest') {
    try {
      const studentDoc = await readDoc('students', user.uid);
      if (studentDoc) role = 'student';
    } catch (e) {
      // Ignore missing/permission failures for student lookup.
    }
  }

  currentRole = role;
  localStorage.setItem('role', role);

  if (role === 'student') {
    try {
      const student = await readDoc('students', user.uid);
      currentApprovalStatus = student?.approvalStatus || 'pending';
    } catch (e) {
      currentApprovalStatus = 'pending';
    }
    localStorage.setItem('approvalStatus', currentApprovalStatus);
    return;
  }

  if (role === 'admin' || role === 'teacher') {
    currentApprovalStatus = 'approved';
    localStorage.setItem('approvalStatus', 'approved');
    return;
  }

  currentApprovalStatus = null;
  localStorage.removeItem('approvalStatus');
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
  const normalizedEmail = typeof email === 'string' ? email.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';
  if (!normalizedEmail) {
    throw new Error('Invalid email address.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!normalizedPassword) {
    throw new Error('Password is required.');
  }
  await initAuth();
  const authInstance = await getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(authInstance, normalizedEmail, normalizedPassword);
  localStorage.removeItem('role');
  const user = credential?.user || authInstance.currentUser;
  await syncAccessState(user);
  return getAuthState();
}

export async function authLogout() {
  await signOut(await getFirebaseAuth());
  localStorage.clear();
  sessionStorage.clear();
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
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  
  if (!state.user) {
    if (role === 'admin') {
      window.location.href = `./login.html?next=${next}`;
    } else {
      window.location.href = './login.html';
    }
    return false;
  }
  
  if (role && state.role !== role) {
    if (role === 'admin') {
      window.location.href = `./login.html?next=${next}`;
    } else {
      window.location.href = './login.html';
    }
    return false;
  }
  
  if (role === 'student' && approvalStatus !== 'approved') {
    if (approvalStatus === 'rejected') {
      const student = state.user;
      // Get rejection reason from Firestore if available
      readDoc('students', student.uid).then(doc => {
        const reason = doc?.rejectionReason || '';
        window.location.href = `./portal-locked.html?status=rejected&reason=${encodeURIComponent(reason)}`;
      }).catch(() => {
        window.location.href = './portal-locked.html?status=rejected';
      });
    } else {
      window.location.href = './portal-locked.html?status=pending';
    }
    return false;
  }
  
  return true;
}
