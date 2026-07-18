const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'profile', label: 'Profile', icon: '◌' },
  { id: 'course', label: 'Current Course', icon: '▶' },
  { id: 'progress', label: 'Progress', icon: '▣' },
  { id: 'tasks', label: 'Assigned Tasks', icon: '☑' },
  { id: 'completed', label: 'Completed Tasks', icon: '✓' },
  { id: 'meeting', label: 'Meeting Link', icon: '↗' },
  { id: 'resources', label: 'Resources', icon: '⬢' },
  { id: 'assignments', label: 'Assignments', icon: '✎' },
  { id: 'announcements', label: 'Announcements', icon: '⚡' },
  { id: 'payment', label: 'Payment Status', icon: '💳' },
  { id: 'logout', label: 'Logout', icon: '⇢' }
];

const contentMap = {
  dashboard: null,
  profile: null,
  course: null,
  progress: null,
  meeting: null,
  resources: null,
  assignments: null,
  announcements: null,
  payment: `<div class="card"><h3>Payment Upload</h3><form id="paymentForm" class="payment-form"><input name="transactionId" placeholder="Transaction ID" required /><select name="paymentMethod" required><option value="">Select payment method</option><option value="Bank Transfer">Bank Transfer</option><option value="JazzCash">JazzCash</option><option value="EasyPaisa">EasyPaisa</option><option value="Card">Card</option></select><input type="date" name="uploadDate" required /><select name="paymentStatus"><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option></select><input type="file" name="screenshot" accept="image/*" required /><button type="submit">Upload Payment</button><div class="progress-track" id="progressTrack"><span id="progressBar"></span></div><div class="status" id="paymentStatus"></div></form></div>`,
  logout: `<div class="card"><h3>Logged Out</h3><p class="muted">You have successfully signed out.</p></div>`
};

import { uploadPayment } from './payment.js';
import { getAuthState, initAuth, requireAuth } from './auth.js';
import { fetchTasksForStudent, markTaskCompleted } from './tasks.js';
import { fetchStudentProgress } from './progress.js';
import { fetchVisibleMeetingLink } from './meetings.js';
import { readDocs, listenDocs, readDoc } from './firestore.js';

const navList = document.getElementById('navList');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const themeToggle = document.getElementById('themeToggle');

function renderNav() {
  navList.innerHTML = navItems.map((item) => `
    <button class="nav-item${item.id === 'dashboard' ? ' active' : ''}" data-id="${item.id}" aria-label="${item.label}" title="${item.label}">
      <span>${item.icon} ${item.label}</span>
    </button>
  `).join('');
}

async function renderTasksView(mode = 'tasks') {
  const state = getAuthState();
  const tasks = await fetchTasksForStudent(state.user?.uid || '');
  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const items = mode === 'completed' ? completed : pending;
  contentArea.innerHTML = `
    <div class="task-section">
      <div class="card">
        <h3>${mode === 'completed' ? 'Completed Tasks' : 'Assigned Tasks'}</h3>
        ${items.map((task) => `
          <div class="task-item">
            <div>
              <strong>${task.title}</strong>
              <p class="muted">${task.description || 'No description'}</p>
              <p class="muted">Due: ${task.dueDate || 'No date'} • ${task.assignedToName || 'All Students'}</p>
            </div>
            ${mode === 'completed' ? '<span class="badge">Completed</span>' : '<button class="action-btn" data-task-id="' + task.id + '" data-action="complete">Mark Complete</button>'}
          </div>
        `).join('') || `<p class="muted">${mode === 'completed' ? 'No completed tasks yet.' : 'No pending tasks.'}</p>`}
      </div>
    </div>`;
}

async function renderProgressView() {
  const state = getAuthState();
  const progress = await fetchStudentProgress(state.user?.uid || '');
  contentArea.innerHTML = `
    <div class="card">
      <h3>Progress Overview</h3>
      <div class="progress-bar-large"><span style="width:${Math.min(100, Math.max(0, progress?.percentage || 0))}%"></span></div>
      <p class="muted">Completion: ${progress?.percentage || 0}%</p>
      <p class="muted">${progress?.remarks || 'No remarks yet.'}</p>
    </div>`;
}

async function renderMeetingView() {
  const state = getAuthState();
  const student = await readDoc('students', state.user?.uid || '');
  const meetings = await readDocs('meetingLinks');
  
  // Filter meetings based on student's learning mode and audience
  const filteredMeetings = meetings.filter(meeting => {
    // Check learning mode filter
    const learningModeMatch = !meeting.learningMode || 
      meeting.learningMode === 'Both' || 
      meeting.learningMode === student?.learningMode;
    
    // Check audience filter
    const audienceMatch = !meeting.audience || 
      meeting.audience === 'all' ||
      (meeting.audience === 'online' && student?.learningMode === 'Online') ||
      (meeting.audience === 'physical' && student?.learningMode === 'Physical');
    
    return learningModeMatch && audienceMatch;
  });

  contentArea.innerHTML = `
    <div class="card">
      <h3>Meeting Links</h3>
      <div class="table-list">
        ${filteredMeetings.map((meeting) => `
          <div class="table-item">
            <div>
              <strong>${meeting.title || 'Meeting'}</strong>
              <p class="muted">Date: ${meeting.date || 'TBD'} • Time: ${meeting.time || 'TBD'}</p>
              <p class="muted">Type: ${meeting.type || 'Online'} • Mode: ${meeting.learningMode || 'All'}</p>
            </div>
            <a class="btn btn-secondary" href="${meeting.link}" target="_blank" rel="noreferrer">Join Meeting</a>
          </div>
        `).join('') || '<p class="muted">No meeting links available yet.</p>'}
      </div>
    </div>`;
}

async function renderResourcesView() {
  const resources = await readDocs('resources');
  contentArea.innerHTML = `
    <div class="card">
      <h3>Resources</h3>
      <div class="resource-list">
        ${resources.map((resource) => `
          <div class="resource-card">
            <div>
              <strong>${resource.title}</strong>
              <p class="muted">${resource.type || 'File'}</p>
            </div>
            <a class="btn btn-secondary" href="${resource.fileUrl}" target="_blank" rel="noreferrer" download="${resource.fileName || resource.title}">Download</a>
          </div>
        `).join('') || '<p class="muted">No resources yet.</p>'}
      </div>
    </div>`;
}

async function renderAssignmentsView() {
  const assignments = await readDocs('assignments');
  contentArea.innerHTML = `
    <div class="card">
      <h3>Assignments</h3>
      <div class="resource-list">
        ${assignments.map((assignment) => `
          <div class="resource-card">
            <div>
              <strong>${assignment.title}</strong>
              <p class="muted">Due: ${assignment.dueDate || 'No date'}</p>
            </div>
            <a class="btn btn-secondary" href="${assignment.fileUrl}" target="_blank" rel="noreferrer">View</a>
          </div>
        `).join('') || '<p class="muted">No assignments yet.</p>'}
      </div>
    </div>`;
}

async function renderDashboardView() {
  const state = getAuthState();
  const student = await readDoc('students', state.user?.uid || '');
  const tasks = await fetchTasksForStudent(state.user?.uid || '');
  const pendingTasks = tasks.filter(t => !t.completed);
  const progress = await fetchStudentProgress(state.user?.uid || '');

  // Update hero card
  const welcomeEl = document.getElementById('welcomeMessage');
  const heroProgressBar = document.getElementById('heroProgressBar');
  const heroProgressText = document.getElementById('heroProgressText');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${student?.fullName || state.user?.displayName || 'Student'}`;
  if (heroProgressBar) heroProgressBar.style.width = `${progress?.percentage || 0}%`;
  if (heroProgressText) heroProgressText.textContent = `${progress?.percentage || 0}% complete`;

  contentArea.innerHTML = `
    <div class="stats-grid">
      <div class="card">
        <h3>Current Course</h3>
        <p class="muted">${student?.course || 'Not assigned'}</p>
      </div>
      <div class="card">
        <h3>Assigned Tasks</h3>
        <p class="muted">${pendingTasks.length} pending</p>
      </div>
      <div class="card">
        <h3>Progress</h3>
        <p class="muted">${progress?.percentage || 0}% complete</p>
      </div>
      <div class="card">
        <h3>Payment Status</h3>
        <p class="muted">${student?.paymentStatus || 'Pending'}</p>
      </div>
    </div>`;
}

async function renderProfileView() {
  const state = getAuthState();
  const student = await readDoc('students', state.user?.uid || '');

  contentArea.innerHTML = `
    <div class="card">
      <h3>Profile</h3>
      <p class="muted">Name: ${student?.fullName || state.user?.displayName || ''}</p>
      <p class="muted">Email: ${student?.email || state.user?.email || ''}</p>
      <p class="muted">Phone: ${student?.phone || ''}</p>
      <p class="muted">Course: ${student?.course || 'Not selected'}</p>
      <p class="muted">Learning Mode: ${student?.learningMode || 'Not specified'}</p>
      <p class="muted">Registration Date: ${student?.createdAt ? new Date(student.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
    </div>`;
}

async function renderCourseView() {
  const state = getAuthState();
  const student = await readDoc('students', state.user?.uid || '');

  contentArea.innerHTML = `
    <div class="card">
      <h3>Current Course</h3>
      <p class="muted">${student?.course || 'Not assigned'}</p>
      <p class="muted">Learning Mode: ${student?.learningMode || 'Not specified'}</p>
    </div>`;
}

async function renderAnnouncementsView() {
  const state = getAuthState();
  const student = await readDoc('students', state.user?.uid || '');
  const announcements = await readDocs('announcements');

  // Filter announcements based on student's approval status and learning mode
  const filteredAnnouncements = announcements.filter(announcement => {
    // Check audience filter
    const audienceMatch = !announcement.audience || 
      announcement.audience === 'all' ||
      (announcement.audience === 'approved' && student?.approvalStatus === 'approved') ||
      (announcement.audience === 'online' && student?.learningMode === 'Online') ||
      (announcement.audience === 'physical' && student?.learningMode === 'Physical');
    
    return audienceMatch;
  });

  // Sort by newest first
  const sortedAnnouncements = filteredAnnouncements.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  contentArea.innerHTML = `
    <div class="card">
      <h3>Announcements</h3>
      <div class="table-list">
        ${sortedAnnouncements.map((announcement) => `
          <div class="table-item">
            <div>
              <strong>${announcement.title || 'Announcement'}</strong>
              <p class="muted">${announcement.message || ''}</p>
              <p class="muted">Priority: ${announcement.priority || 'normal'}</p>
            </div>
            <span class="badge">${announcement.createdAt ? new Date(announcement.createdAt.seconds * 1000).toLocaleDateString() : ''}</span>
          </div>
        `).join('') || '<p class="muted">No announcements yet.</p>'}
      </div>
    </div>`;
}

async function renderContent(id) {
  pageTitle.textContent = navItems.find((item) => item.id === id)?.label || 'Dashboard';
  if (id === 'tasks' || id === 'completed') {
    await renderTasksView(id);
    return;
  }
  if (id === 'progress') {
    await renderProgressView();
    return;
  }
  if (id === 'meeting') {
    await renderMeetingView();
    return;
  }
  if (id === 'resources') {
    await renderResourcesView();
    return;
  }
  if (id === 'assignments') {
    await renderAssignmentsView();
    return;
  }
  if (id === 'dashboard') {
    await renderDashboardView();
    return;
  }
  if (id === 'profile') {
    await renderProfileView();
    return;
  }
  if (id === 'course') {
    await renderCourseView();
    return;
  }
  if (id === 'announcements') {
    await renderAnnouncementsView();
    return;
  }
  contentArea.innerHTML = contentMap[id] || '<div class="card"><p class="muted">Content not available.</p></div>';
  if (id === 'payment') {
    const form = document.getElementById('paymentForm');
    const status = document.getElementById('paymentStatus');
    const progressTrack = document.getElementById('progressTrack');
    const progressBar = document.getElementById('progressBar');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());
        const file = data.get('screenshot');
        if (!file || !file.name) {
          status.textContent = 'Please choose an image.';
          status.className = 'status error';
          return;
        }
        try {
          if (submitBtn) { submitBtn.setAttribute('disabled','disabled'); submitBtn.textContent = 'Uploading...'; }
          status.textContent = 'Uploading...';
          status.className = 'status';
          progressTrack.style.display = 'block';
          progressBar.style.width = '0%';
          await uploadPayment(payload, file, (percent) => {
            progressBar.style.width = `${percent}%`;
          });
          status.textContent = 'Payment uploaded successfully.';
          status.className = 'status success';
          form.reset();
          progressBar.style.width = '100%';
        } catch (error) {
          status.textContent = error.message || 'Upload failed.';
          status.className = 'status error';
        } finally {
          if (submitBtn) { submitBtn.removeAttribute('disabled'); submitBtn.textContent = 'Upload Payment'; }
        }
      });
    }
  }
}

// Load live student profile and payment status
let studentUnsub = null;
async function initStudentListeners() {
  try { if (studentUnsub) studentUnsub(); } catch (e) {}
  const state = getAuthState();
  if (!state.user) return;
  // listen to the student's document
  studentUnsub = await listenDocs('students', [{ field: 'uid', op: '==', value: state.user.uid }], (docs) => {
    const student = (docs && docs[0]) || null;
    if (!student) return;
    // if not approved, redirect to login/blocked
    if (student.approvalStatus !== 'approved') {
      window.location.href = './login.html?status=blocked';
      return;
    }
    // update profile area
    const profileHtml = `
      <div class="card">
        <h3>Profile</h3>
        <p class="muted">Name: ${escapeHtml(student.fullName || state.user.displayName || '')}</p>
        <p class="muted">Email: ${escapeHtml(student.email || state.user.email || '')}</p>
        <p class="muted">Course: ${escapeHtml(student.course || 'Not selected')}</p>
      </div>`;
    // if profile section exists, replace it
    if (document.querySelector('[data-id="profile"]') && pageTitle.textContent === 'Profile') {
      contentArea.innerHTML = profileHtml;
    }
  });
  // listen for payments for this student and update UI
  const paymentsUnsub = await listenDocs('payments', [{ field: 'studentId', op: '==', value: state.user.uid }], (docs) => {
    const latest = (docs && docs[0]) || null;
    const statusEl = document.getElementById('paymentStatus');
    if (statusEl) {
      if (!latest) {
        statusEl.textContent = 'No payments found.';
        statusEl.className = 'status muted';
      } else {
        statusEl.textContent = `Payment status: ${latest.paymentStatus || latest.status || 'Pending'}`;
        statusEl.className = `status ${((latest.paymentStatus||'').toLowerCase())}`;
      }
    }
  });
  // return a combined unsubscribe that cleans both listeners when needed
  return () => { try { studentUnsub && studentUnsub(); } catch(e){}; try { paymentsUnsub && paymentsUnsub(); } catch(e){}; };
}

navList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  await renderContent(button.dataset.id);
});

contentArea.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="complete"]');
  if (!button) return;
  await markTaskCompleted(button.dataset.taskId);
  await renderTasksView();
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

async function boot() {
  await initAuth();
  const state = getAuthState();
  if (!requireAuth('student')) {
    throw new Error('Unauthorized');
  }
  if (state.role === 'student' && state.approvalStatus !== 'approved') {
    // still allow boot but start listeners so we can redirect if status changes
    // initial redirect handled by listeners
  }
  renderNav();
  await renderContent('dashboard');
  await initStudentListeners();
}

boot();
