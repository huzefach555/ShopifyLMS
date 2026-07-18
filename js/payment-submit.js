import { initAuth, getAuthState } from './auth.js';
import { getFirebaseAuth, signOut } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { uploadPayment } from './payment.js';

function findSubmit() {
    return document.getElementById('submitBtn');
}

async function ensureSignedIn() {
    await initAuth();
    const state = getAuthState();
    if (state.user) return true;
    const auth = await getFirebaseAuth();
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                resolve(true);
            } else {
                alert('Please log in before submitting payment.');
                window.location.href = '../login.html';
                resolve(false);
            }
        });
    });
}

function setLoading(btn, isLoading) {
    try {
        if (isLoading) {
            btn.classList.add('loading');
            btn.setAttribute('disabled', 'disabled');
        } else {
            btn.classList.remove('loading');
            btn.removeAttribute('disabled');
        }
    } catch (e) {}
}

async function handleSubmit(event) {
    event.preventDefault();
    const btn = findSubmit();
    if (!await ensureSignedIn()) return;
    setLoading(btn, true);
    try {
        const auth = await getFirebaseAuth();
        const user = auth.currentUser;

        const fileInput = document.getElementById('fileInput');
        const file = fileInput?.files?.[0];
        if (!file) {
            alert('Please select a payment screenshot.');
            setLoading(btn, false);
            return;
        }

        const txnEl = document.getElementById('txnId');
        const fullNameEl = document.getElementById('fullName');
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phone');

        const payload = {
            transactionId: txnEl ? txnEl.value : '',
            fullName: fullNameEl ? fullNameEl.value : (user.displayName || ''),
            email: emailEl ? emailEl.value : (user.email || ''),
            phone: phoneEl ? phoneEl.value : '',
            paymentMethod: 'EasyPaisa',
            uploadDate: new Date().toISOString(),
            paymentStatus: 'Pending'
        };

        const result = await uploadPayment(payload, file, (percent) => {
            try { btn.querySelector('.btn-label').textContent = `Uploading ${percent}%`; } catch(e){}
            try {
                const track = document.getElementById('uploadProgress');
                const bar = document.getElementById('uploadProgressBar');
                if (track && bar) {
                    track.style.display = 'block';
                    bar.style.width = `${percent}%`;
                }
            } catch (e) {}
        });

        window.location.href = '../login.html?status=paymentSubmitted';

    } catch (err) {
        alert(err.message || 'Payment upload failed.');
    } finally {
        const btn = findSubmit();
        try { if (btn) btn.querySelector('.btn-label').textContent = 'Submit Payment'; } catch(e){}
        try {
            const track = document.getElementById('uploadProgress');
            const bar = document.getElementById('uploadProgressBar');
            if (track && bar) {
                bar.style.width = '100%';
                setTimeout(() => { track.style.display = 'none'; bar.style.width = '0%'; }, 800);
            }
        } catch (e) {}
        setLoading(btn, false);
    }
}

// Attach handler after DOM is ready
async function attachHandlers() {
    try {
        await initAuth();
    } catch (err) {
        alert('Authentication failed. Please log in again.');
        window.location.href = '../login.html';
        return;
    }
    const state = getAuthState();
    if (!state.user) {
        window.location.href = '../login.html';
        return;
    }

    // Pre-fill student data from Firestore
    try {
        const { readDoc } = await import('./firestore.js');
        const student = await readDoc('students', state.user.uid);
        if (student) {
            const fullNameEl = document.getElementById('fullName');
            const emailEl = document.getElementById('email');
            const phoneEl = document.getElementById('phone');
            if (fullNameEl) fullNameEl.value = student.fullName || '';
            if (emailEl) emailEl.value = student.email || '';
            if (phoneEl) phoneEl.value = student.phone || '';
        }
    } catch (err) {
        // If we can't load student data, continue anyway
    }

    const btn = findSubmit();
    if (btn) btn.addEventListener('click', handleSubmit);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHandlers);
} else {
    attachHandlers();
}