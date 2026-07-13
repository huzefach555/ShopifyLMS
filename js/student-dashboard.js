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
  dashboard: `<div class="stats-grid"><div class="card"><h3>Current Course</h3><p class="muted">Shopify Store Setup</p></div><div class="card"><h3>Assigned Tasks</h3><p class="muted">Pending task list</p></div><div class="card"><h3>Upcoming Session</h3><p class="muted">Live class tomorrow</p></div><div class="card"><h3>Payment</h3><p class="muted">Upload your proof below</p></div></div>`,
  profile: `<div class="card"><h3>Profile</h3><p class="muted">Name: Ayesha Khan</p><p class="muted">Email: ayesha@example.com</p><p class="muted">Phone: +92 300 1234567</p></div>`,
  course: `<div class="card"><h3>Current Course</h3><p class="muted">Shopify Crash Course — Module 3: Conversion Growth</p></div>`,
  progress: `<div class="card"><h3>Progress</h3><p class="muted">Module 1 Completed</p><p class="muted">Module 2 In Review</p><p class="muted">Module 3 Active</p></div>`,
  meeting: `<div class="card"><h3>Meeting Link</h3><p class="muted">Join your live mentor session here: <a href="#">https://meet.example.com/mentor</a></p></div>`,
  resources: `<div class="resource-grid"><div class="card"><h3>Templates</h3><p class="muted">Download store templates</p></div><div class="card"><h3>Guides</h3><p class="muted">Access step-by-step PDFs</p></div></div>`,
  assignments: `<div class="card"><h3>Assignments</h3><p class="muted">Assignments are listed in the task view.</p></div>`,
  announcements: `<div class="card"><h3>Announcements</h3><p class="muted">New live session added for this week.</p></div>`,
  payment: `<div class="card"><h3>Payment Upload</h3><form id="paymentForm" class="payment-form"><input name="transactionId" placeholder="Transaction ID" required /><select name="paymentMethod" required><option value="">Select payment method</option><option value="Bank Transfer">Bank Transfer</option><option value="JazzCash">JazzCash</option><option value="EasyPaisa">EasyPaisa</option><option value="Card">Card</option></select><input type="date" name="uploadDate" required /><select name="paymentStatus"><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Rejected">Rejected</option></select><input type="file" name="screenshot" accept="image/*" required /><button type="submit">Upload Payment</button><div class="progress-track" id="progressTrack"><span id="progressBar"></span></div><div class="status" id="paymentStatus"></div></form></div>`,
  logout: `<div class="card"><h3>Logged Out</h3><p class="muted">You have successfully signed out.</p></div>`
};

import { uploadPayment } from './payment.js';
import { getAuthState, initAuth } from './auth.js';
import { fetchTasksForStudent, markTaskCompleted } from './tasks.js';
import { fetchStudentProgress } from './progress.js';
import { fetchVisibleMeetingLink } from './meetings.js';
import { readDocs } from './firestore.js';

const navList = document.getElementById('navList');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const themeToggle = document.getElementById('themeToggle');

function renderNav() {
  navList.innerHTML = navItems.map((item) => `<button class="nav-item${item.id === 'dashboard' ? ' active' : ''}" data-id="${item.id}"><span>${item.icon} ${item.label}</span></button>`).join('');
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
  const link = await fetchVisibleMeetingLink(state.user?.uid || '');
  contentArea.innerHTML = `
    <div class="card">
      <h3>Latest Meeting Link</h3>
      ${link ? `<p><a href="${link.url}" target="_blank" rel="noreferrer">${link.title} • ${link.platform}</a></p>` : '<p class="muted">No active meeting link is available yet.</p>'}
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
  contentArea.innerHTML = contentMap[id] || contentMap.dashboard;
  if (id === 'payment') {
    const form = document.getElementById('paymentForm');
    const status = document.getElementById('paymentStatus');
    const progressTrack = document.getElementById('progressTrack');
    const progressBar = document.getElementById('progressBar');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());
        const file = data.get('screenshot');
        if (!file || !file.name) {
          status.textContent = 'Please choose an image.';
          status.className = 'status error';
          return;
        }
        status.textContent = 'Uploading...';
        status.className = 'status';
        progressTrack.style.display = 'block';
        progressBar.style.width = '0%';
        try {
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
        }
      });
    }
  }
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
  if (state.role === 'student' && state.approvalStatus !== 'approved') {
    window.location.href = './login.html?status=blocked';
    return;
  }
  renderNav();
  await renderContent('dashboard');
}

boot();
