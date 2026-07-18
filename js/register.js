import { initializeFirebase, registerStudent, getFirebaseAuth } from './firebase.js';

const form = document.getElementById('studentForm');
const message = document.getElementById('formMessage');

const requiredFields = ['fullName', 'fatherName', 'email', 'phone', 'whatsapp', 'city', 'country', 'age', 'gender', 'course', 'learningMode', 'password', 'confirmPassword'];

function setMessage(text, ok) {
  message.textContent = text;
  message.style.color = ok ? '#1f9d73' : '#ca2f5d';
}

function validate(data) {
  for (const field of requiredFields) {
    if (!String(data[field] || '').trim()) return 'All fields are required.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
  if (!/^\+?[0-9\s-]{7,15}$/.test(data.phone)) return 'Enter a valid phone number.';
  if (!/^\+?[0-9\s-]{7,15}$/.test(data.whatsapp)) return 'Enter a valid WhatsApp number.';
  if (Number(data.age) < 12 || Number(data.age) > 80) return 'Age must be between 12 and 80.';
  if (data.password.length < 6) return 'Password must be at least 6 characters.';
  if (data.password !== data.confirmPassword) return 'Passwords do not match.';
  return '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const error = validate(data);
  if (error) {
    setMessage(error, false);
    return;
  }
  try {
    await initializeFirebase();
    const fileInput = form.querySelector('input[name="photo"]');
    const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    const payload = { ...data };
    delete payload.photo;
    const result = await registerStudent(payload, file);
    setMessage(`Registration successful for ${result.user.email}.`, true);
    window.location.href = "./pages/payment.html";
    form.reset();
  } catch (error) {
    setMessage((error && (error.message || error.code)) || 'Registration failed.', false);
  }
});
