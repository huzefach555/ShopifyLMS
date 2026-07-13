import { readDocs, updateDocById } from './firestore.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'students', label: 'Manage Students', icon: '👥' },
  { id: 'teachers', label: 'Manage Teachers', icon: '🧑‍🏫' },
  { id: 'approve', label: 'Approve Students', icon: '✓' },
  { id: 'reject', label: 'Reject Students', icon: '✕' },
  { id: 'payment', label: 'Payment Verification', icon: '💳' },
  { id: 'courses', label: 'Courses', icon: '📚' },
  { id: 'resources', label: 'Resources', icon: '⬢' },
  { id: 'announcements', label: 'Announcements', icon: '⚡' },
  { id: 'meetings', label: 'Meeting Links', icon: '↗' },
  { id: 'analytics', label: 'Analytics', icon: '▣' },
  { id: 'logout', label: 'Logout', icon: '⇢' }
];

const contentMap = {
  dashboard: `<div class="stats-grid"><div class="card"><h3>Students</h3><p class="muted">Live roster</p></div><div class="card"><h3>Teachers</h3><p class="muted">Active faculty</p></div><div class="card"><h3>Pending</h3><p class="muted">Approval queue</p></div><div class="card"><h3>Revenue</h3><p class="muted">Payments pending</p></div></div>`,
  students: `<div class="grid-2"><div class="card"><h3>Student List</h3><p class="muted">Approval and access can be managed from the approvals section.</p></div><div class="card"><h3>Manage Access</h3><p class="muted">Approve or reject students to grant or restrict dashboard access.</p></div></div>`,
  teachers: `<div class="card"><h3>Teacher List</h3><p class="muted">Teacher management is available in the main operations view.</p></div>`,
  approve: `<div class="card"><h3>Approve Students</h3><p class="muted">Review and approve new enrollments.</p></div>`,
  reject: `<div class="card"><h3>Reject Students</h3><p class="muted">Decline incomplete or invalid applications.</p></div>`,
  payment: `<div class="card"><h3>Payment Verification</h3><p class="muted">Verify pending payment requests and installment status.</p></div>`,
  courses: `<div class="card"><h3>Courses</h3><p class="muted">Manage course catalog and published modules.</p></div>`,
  resources: `<div class="card"><h3>Resources</h3><p class="muted">Upload and organize student learning materials.</p></div>`,
  announcements: `<div class="card"><h3>Announcements</h3><p class="muted">Send updates to students and teachers.</p></div>`,
  meetings: `<div class="card"><h3>Meeting Links</h3><p class="muted">Publish meeting links for group sessions and reviews.</p></div>`,
  analytics: `<div class="card"><h3>Analytics</h3><p class="muted">Review student retention, growth, and engagement data.</p></div>`,
  logout: `<div class="card"><h3>Logout</h3><p class="muted">Session closed successfully.</p></div>`
};

const navList = document.getElementById('navList');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const themeToggle = document.getElementById('themeToggle');

let students = [];
let payments = [];

function renderNav() {
  navList.innerHTML = navItems.map((item) => `<button class="nav-item${item.id === 'dashboard' ? ' active' : ''}" data-id="${item.id}"><span>${item.icon} ${item.label}</span></button>`).join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getPaymentForStudent(studentId) {
  return payments.find((payment) => payment.studentId === studentId) || null;
}

function renderBadge(status) {
  const safeStatus = status || 'pending';
  const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
  return `<span class="status-chip ${safeStatus}">${label}</span>`;
}

function renderApprovalContent() {
  const pendingCount = students.filter((student) => (student.approvalStatus || 'pending') === 'pending').length;
  const approvedCount = students.filter((student) => student.approvalStatus === 'approved').length;
  const rejectedCount = students.filter((student) => student.approvalStatus === 'rejected').length;
  const list = students.map((student) => {
    const payment = getPaymentForStudent(student.uid);
    return `
      <div class="approval-item">
        <div class="approval-meta">
          <div>
            <strong>${escapeHtml(student.fullName || student.email || 'Student')}</strong>
            <p class="muted">${escapeHtml(student.email || '')}</p>
            <p class="muted">${escapeHtml(student.course || 'No course selected')}</p>
          </div>
          <div class="approval-actions">
            ${renderBadge(student.approvalStatus || 'pending')}
            <select class="status-select" data-action="status" data-student-id="${student.uid}">
              <option value="pending" ${student.approvalStatus === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="approved" ${student.approvalStatus === 'approved' ? 'selected' : ''}>Approved</option>
              <option value="rejected" ${student.approvalStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <button class="action-btn approve" data-action="approve" data-student-id="${student.uid}">Approve</button>
            <button class="action-btn reject" data-action="reject" data-student-id="${student.uid}">Reject</button>
          </div>
        </div>
        <div class="approval-footer">
          ${payment?.screenshotUrl ? `<img class="approval-photo" src="${escapeHtml(payment.screenshotUrl)}" alt="Payment screenshot" />` : '<div class="payment-card empty">No payment screenshot uploaded yet.</div>'}
        </div>
      </div>`;
  }).join('');

  contentArea.innerHTML = `
    <div class="card">
      <div class="approval-header">
        <div>
          <h3>Student approvals</h3>
          <p class="muted">Review payment proof and manage access.</p>
        </div>
        <div class="approval-summary">
          <span class="summary-pill">Pending: ${pendingCount}</span>
          <span class="summary-pill">Approved: ${approvedCount}</span>
          <span class="summary-pill">Rejected: ${rejectedCount}</span>
        </div>
      </div>
      <div class="approval-list">${list || '<p class="muted">No students found.</p>'}</div>
    </div>`;
}

async function loadApprovalData() {
  const [studentDocs, paymentDocs] = await Promise.all([readDocs('students'), readDocs('payments')]);
  students = studentDocs;
  payments = paymentDocs;
  renderApprovalContent();
}

async function updateApproval(studentId, status) {
  await updateDocById('students', studentId, { approvalStatus: status, updatedAt: serverTimestamp() });
  const payment = getPaymentForStudent(studentId);
  if (payment) {
    await updateDocById('payments', payment.id, {
      paymentStatus: status === 'approved' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending'
    });
  }
  await loadApprovalData();
}

async function renderContent(id) {
  pageTitle.textContent = navItems.find((item) => item.id === id)?.label || 'Dashboard';
  if (id === 'approve') {
    contentArea.innerHTML = '<div class="card"><p class="muted">Loading approvals...</p></div>';
    await loadApprovalData();
    return;
  }
  contentArea.innerHTML = contentMap[id] || contentMap.dashboard;
}

navList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  await renderContent(button.dataset.id);
});

contentArea.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const studentId = button.dataset.studentId;
  await updateApproval(studentId, action === 'approve' ? 'approved' : 'rejected');
});

contentArea.addEventListener('change', async (event) => {
  const select = event.target.closest('select[data-action="status"]');
  if (!select) return;
  await updateApproval(select.dataset.studentId, select.value);
});

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'light' ? '☀' : '☾';
});

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'light' ? '☀' : '☾';
renderNav();
await renderContent('dashboard');
