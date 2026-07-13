const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'profile', label: 'Profile', icon: '◌' },
  { id: 'students', label: 'Students', icon: '👥' },
  { id: 'createTask', label: 'Create Task', icon: '＋' },
  { id: 'uploadNotes', label: 'Upload Resources', icon: '⬆' },
  { id: 'uploadAssignments', label: 'Upload Assignments', icon: '▤' },
  { id: 'meeting', label: 'Meeting Link', icon: '↗' },
  { id: 'announcements', label: 'Announcements', icon: '⚡' },
  { id: 'progress', label: 'Progress Management', icon: '▣' },
  { id: 'logout', label: 'Logout', icon: '⇢' }
];

import { uploadAssignmentFile, uploadResourceFile } from './upload.js';
import { createTask, deleteTask, fetchAssignableStudents, fetchTasksForTeacher, updateTask } from './tasks.js';
import { fetchProgressRecords, saveStudentProgress } from './progress.js';
import { deleteMeetingLink, fetchMeetingLinks, saveMeetingLink } from './meetings.js';
import { readDocs } from './firestore.js';

const contentMap = {
  dashboard: `<div class="stats-grid"><div class="card"><h3>Students</h3><p class="muted">Live roster</p></div><div class="card"><h3>Tasks</h3><p class="muted">Manage all tasks</p></div><div class="card"><h3>Notes</h3><p class="muted">Upload materials</p></div><div class="card"><h3>Meetings</h3><p class="muted">Schedule sessions</p></div></div>`,
  profile: `<div class="card"><h3>Profile</h3><p class="muted">Name: Hassan Khan</p><p class="muted">Email: hassan@example.com</p><p class="muted">Specialty: Shopify Growth</p></div>`,
  students: `<div class="card"><h3>Student Overview</h3><p class="muted">Students are listed in the task assignment form.</p></div>`,
  createTask: `<div class="card"><h3>Create Task</h3><p class="muted">Create and assign tasks to students.</p></div>`,
  uploadNotes: `<div class="card"><h3>Upload Resources</h3><form id="notesForm" class="payment-form"><input name="title" placeholder="Resource title" required /><select name="type" required><option value="">Select type</option><option value="PDF">PDF</option><option value="ZIP">ZIP</option></select><input type="file" name="file" accept=".pdf,.zip" required /><button type="submit">Upload Resource</button><div class="progress-track" id="notesProgressTrack"><span id="notesProgressBar"></span></div><div class="status" id="notesStatus"></div></form></div>`,
  uploadAssignments: `<div class="card"><h3>Upload Assignments</h3><form id="assignmentForm" class="payment-form"><input name="title" placeholder="Assignment title" required /><input type="date" name="dueDate" required /><input type="file" name="file" accept=".pdf,.zip" required /><button type="submit">Upload Assignment</button><div class="progress-track" id="assignProgressTrack"><span id="assignProgressBar"></span></div><div class="status" id="assignStatus"></div></form></div>`,
  meeting: `<div class="card"><h3>Meeting Link</h3><p class="muted">Join classroom: https://meet.example.com/teacher</p></div>`,
  announcements: `<div class="card"><h3>Announcements</h3><p class="muted">New reminder posted for all enrolled students.</p></div>`,
  progress: `<div class="card"><h3>Progress Management</h3><p class="muted">Track completion, milestones, and learner engagement.</p></div>`,
  logout: `<div class="card"><h3>Logout</h3><p class="muted">Session ended successfully.</p></div>`
};

const navList = document.getElementById('navList');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const themeToggle = document.getElementById('themeToggle');

let taskState = { students: [], tasks: [] };

function renderNav() {
  navList.innerHTML = navItems.map((item) => `<button class="nav-item${item.id === 'dashboard' ? ' active' : ''}" data-id="${item.id}"><span>${item.icon} ${item.label}</span></button>`).join('');
}

async function renderTaskManager() {
  taskState.students = await fetchAssignableStudents();
  taskState.tasks = await fetchTasksForTeacher();
  const { students, tasks } = taskState;
  contentArea.innerHTML = `
    <div class="card task-card">
      <h3>Create Task</h3>
      <form id="taskForm" class="task-form">
        <input name="title" placeholder="Task title" required />
        <textarea name="description" placeholder="Task details" rows="3"></textarea>
        <input type="date" name="dueDate" />
        <select name="assignedTo">
          <option value="all">All students</option>
          ${students.map((student) => `<option value="${student.uid}">${student.fullName || student.email}</option>`).join('')}
        </select>
        <button type="submit">Save Task</button>
      </form>
      <div class="status" id="taskStatus"></div>
      <div class="task-list">
        ${tasks.map((task) => `
          <div class="task-item">
            <div>
              <strong>${task.title}</strong>
              <p class="muted">${task.description || 'No description'}</p>
              <p class="muted">Due: ${task.dueDate || 'No date'} • ${task.assignedToName || 'All Students'}</p>
            </div>
            <div class="task-actions">
              <button class="action-btn" data-task-id="${task.id}" data-action="edit">Edit</button>
              <button class="action-btn danger" data-task-id="${task.id}" data-action="delete">Delete</button>
            </div>
          </div>
        `).join('') || '<p class="muted">No tasks yet.</p>'}
      </div>
    </div>`;

  const form = document.getElementById('taskForm');
  const status = document.getElementById('taskStatus');
  let editingId = null;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    const selectedStudent = students.find((student) => student.uid === payload.assignedTo);
    try {
      if (editingId) {
        await updateTask(editingId, {
          ...payload,
          assignedToName: selectedStudent ? selectedStudent.fullName || selectedStudent.email : 'All Students'
        });
        status.textContent = 'Task updated.';
      } else {
        await createTask({
          ...payload,
          assignedToName: selectedStudent ? selectedStudent.fullName || selectedStudent.email : 'All Students'
        });
        status.textContent = 'Task created.';
      }
      form.reset();
      editingId = null;
      await renderTaskManager();
    } catch (error) {
      status.textContent = error.message || 'Task action failed.';
    }
  });
}

async function renderProgressManager() {
  const students = await fetchAssignableStudents();
  const progressRecords = await fetchProgressRecords();
  contentArea.innerHTML = `
    <div class="card task-card">
      <h3>Progress Management</h3>
      <div class="progress-grid">
        ${students.map((student) => {
          const record = progressRecords.find((item) => item.studentId === student.uid);
          return `
            <div class="progress-card">
              <strong>${student.fullName || student.email}</strong>
              <p class="muted">${student.email || ''}</p>
              <form class="progress-form" data-student-id="${student.uid}" data-student-name="${student.fullName || student.email}">
                <input type="number" min="0" max="100" name="percentage" value="${record?.percentage || 0}" required />
                <textarea name="remarks" rows="2" placeholder="Add remarks">${record?.remarks || ''}</textarea>
                <button type="submit">Save</button>
              </form>
            </div>`;
        }).join('')}
      </div>
    </div>`;

  contentArea.querySelectorAll('.progress-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      await saveStudentProgress({
        studentId: form.dataset.studentId,
        studentName: form.dataset.studentName,
        percentage: payload.percentage,
        remarks: payload.remarks
      });
      await renderProgressManager();
    });
  });
}

async function renderMeetingManager() {
  const links = await fetchMeetingLinks();
  contentArea.innerHTML = `
    <div class="card task-card">
      <h3>Meeting Links</h3>
      <form id="meetingForm" class="task-form">
        <input name="title" placeholder="Title" required />
        <select name="platform">
          <option value="Google Meet">Google Meet</option>
          <option value="Zoom">Zoom</option>
        </select>
        <input name="url" placeholder="https://..." required />
        <button type="submit">Save Link</button>
      </form>
      <div class="status" id="meetingStatus"></div>
      <div class="task-list">
        ${links.map((link) => `
          <div class="task-item">
            <div>
              <strong>${link.title}</strong>
              <p class="muted">${link.platform}</p>
              <a href="${link.url}" target="_blank" rel="noreferrer">Open link</a>
            </div>
            <div class="task-actions">
              <button class="action-btn" data-link-id="${link.id}" data-action="edit">Edit</button>
              <button class="action-btn danger" data-link-id="${link.id}" data-action="delete">Delete</button>
            </div>
          </div>
        `).join('') || '<p class="muted">No meeting links yet.</p>'}
      </div>
    </div>`;

  const form = document.getElementById('meetingForm');
  const status = document.getElementById('meetingStatus');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const editingId = form.dataset.editingId || null;
    try {
      if (editingId) {
        await saveMeetingLink({ id: editingId, ...payload });
        status.textContent = 'Link updated.';
      } else {
        await saveMeetingLink(payload);
        status.textContent = 'Link saved.';
      }
      form.reset();
      delete form.dataset.editingId;
      await renderMeetingManager();
    } catch (error) {
      status.textContent = error.message || 'Failed.';
    }
  });
}

async function renderContent(id) {
  pageTitle.textContent = navItems.find((item) => item.id === id)?.label || 'Dashboard';
  if (id === 'createTask') {
    await renderTaskManager();
    return;
  }
  if (id === 'progress') {
    await renderProgressManager();
    return;
  }
  if (id === 'meeting') {
    await renderMeetingManager();
    return;
  }
  contentArea.innerHTML = contentMap[id] || contentMap.dashboard;
  if (id === 'uploadNotes') {
    const form = document.getElementById('notesForm');
    const status = document.getElementById('notesStatus');
    const progressTrack = document.getElementById('notesProgressTrack');
    const progressBar = document.getElementById('notesProgressBar');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());
        const file = data.get('file');
        status.textContent = 'Uploading...';
        status.className = 'status';
        progressTrack.style.display = 'block';
        progressBar.style.width = '0%';
        try {
          await uploadResourceFile(payload, file, (percent) => {
            progressBar.style.width = `${percent}%`;
          });
          status.textContent = 'Resource uploaded successfully.';
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
  if (id === 'uploadAssignments') {
    const form = document.getElementById('assignmentForm');
    const status = document.getElementById('assignStatus');
    const progressTrack = document.getElementById('assignProgressTrack');
    const progressBar = document.getElementById('assignProgressBar');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = Object.fromEntries(data.entries());
        const file = data.get('file');
        status.textContent = 'Uploading...';
        status.className = 'status';
        progressTrack.style.display = 'block';
        progressBar.style.width = '0%';
        try {
          await uploadAssignmentFile(payload, file, (percent) => {
            progressBar.style.width = `${percent}%`;
          });
          status.textContent = 'Assignment uploaded successfully.';
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
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.taskId) {
    const taskId = button.dataset.taskId;
    const action = button.dataset.action;
    if (action === 'delete') {
      await deleteTask(taskId);
      await renderTaskManager();
      return;
    }
    const task = taskState.tasks.find((item) => item.id === taskId);
    if (task) {
      const formEl = document.getElementById('taskForm');
      formEl.title.value = task.title || '';
      formEl.description.value = task.description || '';
      formEl.dueDate.value = task.dueDate || '';
      formEl.assignedTo.value = task.assignedTo || 'all';
      const statusEl = document.getElementById('taskStatus');
      statusEl.textContent = 'Editing task.';
    }
    return;
  }
  if (button.dataset.linkId) {
    const linkId = button.dataset.linkId;
    const action = button.dataset.action;
    if (action === 'delete') {
      await deleteMeetingLink(linkId);
      await renderMeetingManager();
      return;
    }
    const links = await fetchMeetingLinks();
    const link = links.find((item) => item.id === linkId);
    if (link) {
      const formEl = document.getElementById('meetingForm');
      formEl.title.value = link.title || '';
      formEl.platform.value = link.platform || 'Google Meet';
      formEl.url.value = link.url || '';
      const statusEl = document.getElementById('meetingStatus');
      statusEl.textContent = 'Editing meeting link.';
      formEl.dataset.editingId = linkId;
    }
  }
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
