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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await initAuth();
    const state = await authLogin(data.email, data.password, data.role);
    if (data.role === 'student' && state.approvalStatus !== 'approved') {
      await authLogout();
      setMsg('Your account is pending approval.', false);
      return;
    }
    setMsg('Signed in successfully.', true);
    redirectByRole(data.role);
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

window.addEventListener('load', async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') === 'blocked') {
    setMsg('Your account must be approved before accessing the dashboard.', false);
  }
  await initAuth();
  const state = getAuthState();
  if (state.user) {
    if (state.role === 'student' && state.approvalStatus !== 'approved') {
      await authLogout();
      setMsg('Your account must be approved first.', false);
      return;
    }
    redirectByRole(state.role);
  }
});

window.addEventListener('beforeunload', () => {
  if (document.visibilityState === 'hidden') authLogout().catch(() => {});
});
