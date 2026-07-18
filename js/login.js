import { initAuth, authLogin, authLogout, resetPassword, getAuthState } from './auth.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');
const resetLink = document.getElementById('resetLink');

function setMsg(text, ok = false) {
  msg.textContent = text;
  msg.style.color = ok ? '#1f9d73' : '#ca2f5d';
}

async function redirectByRole(role) {
  if (role === 'teacher') window.location.href = './teacher-dashboard.html';
  else if (role === 'admin') window.location.href = './admin-dashboard.html';
  else window.location.href = './student-dashboard.html';
}

function isSafeNext(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.includes('//') && !url.includes(':');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const email = emailInput && typeof emailInput.value === 'string' ? emailInput.value.trim() : '';
  const password = passwordInput && typeof passwordInput.value === 'string' ? passwordInput.value : '';
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  if (!email) {
    setMsg('Please enter your email address.', false);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMsg('Please enter a valid email address.', false);
    return;
  }
  if (!password) {
    setMsg('Please enter your password.', false);
    return;
  }

  try {
    await initAuth();
    const state = await authLogin(email, password);
    if (state.role === 'guest') {
      await authLogout();
      setMsg('Your account is not registered or is not authorized to sign in here.', false);
      return;
    }
    if (state.role === 'student') {
      if (state.approvalStatus === 'pending') {
        window.location.href = './portal-locked.html?status=pending';
        return;
      }
      if (state.approvalStatus === 'rejected') {
        // Get rejection reason from Firestore
        const { readDoc } = await import('./firestore.js');
        const student = await readDoc('students', state.user.uid);
        const reason = student?.rejectionReason || '';
        window.location.href = `./portal-locked.html?status=rejected&reason=${encodeURIComponent(reason)}`;
        return;
      }
    }
    setMsg('Signed in successfully.', true);
    if (next && isSafeNext(next)) {
      window.location.href = next;
      return;
    }
    redirectByRole(state.role);
  } catch (error) {
    setMsg(error.message || 'Login failed.', false);
  }
});

resetLink.addEventListener('click', async (event) => {
  event.preventDefault();
  const email = prompt('Enter your email');
  if (!email) return;
  try {
    await initAuth();
    await resetPassword(email);
    setMsg('Password reset email sent.', true);
  } catch (error) {
    setMsg(error.message || 'Reset failed.', false);
  }
});

const popup = document.getElementById('loginPopup');
const popupClose = document.getElementById('popupClose');
function showPopup(message) {
  const content = document.getElementById('popupContent');
  if (content) content.textContent = message;
  if (popup) popup.classList.add('show');
}
if (popupClose) {
  popupClose.addEventListener('click', () => {
    if (popup) popup.classList.remove('show');
  });
}

window.addEventListener('load', async () => {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  const status = params.get('status');
  
  if (status === 'pending') {
    setMsg('Your portal is locked. Waiting for admin approval.', false);
    return;
  }
  if (status === 'rejected') {
    setMsg('Your registration has been rejected. Contact support.', false);
    return;
  }
  if (status === 'blocked') {
    setMsg('Your account must be approved before accessing the dashboard.', false);
    return;
  }
  if (status === 'paymentSubmitted') {
    showPopup('Your payment has been received and is awaiting admin approval. You can login again after approval.');
  }
  
  try {
    await initAuth();
    const state = getAuthState();
    if (state.user) {
      if (next && next === './admin-dashboard.html' && state.role !== 'admin') {
        setMsg('You are currently signed in as a student. Please log out and sign in with your admin account.', false);
        return;
      }
      if (state.role === 'student') {
        if (state.approvalStatus === 'pending') {
          window.location.href = './portal-locked.html?status=pending';
          return;
        }
        if (state.approvalStatus === 'rejected') {
          // Get rejection reason from Firestore
          const { readDoc } = await import('./firestore.js');
          const student = await readDoc('students', state.user.uid);
          const reason = student?.rejectionReason || '';
          window.location.href = `./portal-locked.html?status=rejected&reason=${encodeURIComponent(reason)}`;
          return;
        }
      }
      if (next && !next.includes('//') && next.startsWith('./') && state.role === 'admin') {
        window.location.href = next;
        return;
      }
      redirectByRole(state.role);
    }
  } catch (error) {
    console.error('Auto-login failed:', error);
  }
});
