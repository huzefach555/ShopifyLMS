import { readDocs, listenDocs, updateDocById, deleteDocById, createDoc } from './firestore.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'students', label: 'Manage Students', icon: '👥' },
  { id: 'approve', label: 'Approve Students', icon: '✓' },
  { id: 'reject', label: 'Reject Students', icon: '✕' },
  { id: 'payment', label: 'Payment Verification', icon: '💳' },
  { id: 'announcements', label: 'Announcements', icon: '⚡' },
  { id: 'meetings', label: 'Meeting Links', icon: '↗' }
];

const navList = document.getElementById('navList');
const contentArea = document.getElementById('contentArea');
const pageTitle = document.getElementById('pageTitle');
const statsGrid = document.getElementById('statsGrid');
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalFooter = document.getElementById('modalFooter');

let students = [];
let payments = [];
let studentsUnsub = null;
let paymentsUnsub = null;
let currentPage = 'dashboard';
let searchQuery = '';

function renderNav() {
  navList.innerHTML = navItems.map((item) => `
    <button class="nav-item${item.id === currentPage ? ' active' : ''}" data-id="${item.id}">
      <span>${item.icon} ${item.label}</span>
    </button>
  `).join('');
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getPaymentForStudent(studentId) {
  return payments.find((payment) => payment.studentId === studentId || payment.studentUid === studentId) || null;
}

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

function openModal(title, body, footer) {
  modalTitle.textContent = title;
  modalBody.innerHTML = body;
  modalFooter.innerHTML = footer;
  modalOverlay.classList.add('active');
}

function renderStats() {
  const totalStudents = students.length;
  const approvedStudents = students.filter(s => s.approvalStatus === 'approved').length;
  const pendingStudents = students.filter(s => (s.approvalStatus || 'pending') === 'pending').length;
  const rejectedStudents = students.filter(s => s.approvalStatus === 'rejected').length;

  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalStudents}</div>
      <div class="stat-label">Total Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${approvedStudents}</div>
      <div class="stat-label">Approved</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${pendingStudents}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${rejectedStudents}</div>
      <div class="stat-label">Rejected</div>
    </div>
  `;
}

function renderDashboard() {
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (student.fullName || '').toLowerCase().includes(searchLower) ||
      (student.email || '').toLowerCase().includes(searchLower) ||
      (student.phone || '').toLowerCase().includes(searchLower) ||
      (student.course || '').toLowerCase().includes(searchLower)
    );
  });

  const tableRows = filteredStudents.map(student => {
    const payment = getPaymentForStudent(student.uid);
    const status = student.approvalStatus || 'pending';
    const paymentStatus = payment?.paymentStatus || 'pending';
    return `
      <tr>
        <td><strong>${escapeHtml(student.fullName || student.email || 'N/A')}</strong></td>
        <td>${escapeHtml(student.email || 'N/A')}</td>
        <td>${escapeHtml(student.phone || 'N/A')}</td>
        <td>${escapeHtml(student.course || 'N/A')}</td>
        <td><span class="status-badge ${paymentStatus}">${paymentStatus}</span></td>
        <td><span class="status-badge ${status}">${status}</span></td>
        <td>${formatDate(student.createdAt)}</td>
        <td>
          <button class="btn btn-secondary" data-action="view-profile" data-student-id="${student.uid}">View</button>
        </td>
      </tr>
    `;
  }).join('');

  contentArea.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <div class="table-title">All Students</div>
        <div class="table-actions">
          <input type="text" class="search-input" placeholder="Search students..." value="${escapeHtml(searchQuery)}" id="searchInput">
          <button class="btn btn-secondary" id="exportBtn">Export CSV</button>
        </div>
      </div>
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Course</th>
              <th>Payment Status</th>
              <th>Approval Status</th>
              <th>Registration Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8" class="empty-state">No students found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderDashboard();
  });

  document.getElementById('exportBtn')?.addEventListener('click', exportStudentsToCSV);
}

function renderApprovalContent() {
  const pendingStudents = students.filter((student) => (student.approvalStatus || 'pending') === 'pending');
  
  if (pendingStudents.length === 0) {
    contentArea.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">✓</div>
          <h3>No Pending Students</h3>
          <p>All students have been reviewed.</p>
        </div>
      </div>
    `;
    return;
  }

  const studentCards = pendingStudents.map((student) => {
    const payment = getPaymentForStudent(student.uid);
    const registrationDate = formatDate(student.createdAt);
    const initials = (student.fullName || student.email || 'S').charAt(0).toUpperCase();
    
    return `
      <div class="student-card">
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
          <div class="student-name">${escapeHtml(student.fullName || student.email || 'Student')}</div>
          <div class="student-details">
            <span>Email: ${escapeHtml(student.email || 'N/A')}</span>
            <span>Phone: ${escapeHtml(student.phone || 'N/A')}</span>
            <span>UID: ${escapeHtml(student.uid || 'N/A')}</span>
            <span>Registered: ${registrationDate}</span>
            <span>Course: ${escapeHtml(student.course || 'N/A')}</span>
            <span>Payment Method: ${escapeHtml(payment?.paymentMethod || 'N/A')}</span>
            <span>Transaction ID: ${escapeHtml(payment?.transactionId || 'N/A')}</span>
          </div>
          ${payment?.screenshotUrl ? `
            <div style="margin-top: 1rem;">
              <strong>Payment Screenshot:</strong>
              <img src="${escapeHtml(payment.screenshotUrl)}" alt="Payment screenshot" class="payment-screenshot" />
            </div>
          ` : '<p style="margin-top: 1rem; color: var(--muted);">No payment screenshot uploaded</p>'}
        </div>
        <div class="student-actions">
          <button class="btn btn-success" data-action="approve" data-student-id="${student.uid}">✓ Approve</button>
          <button class="btn btn-danger" data-action="reject" data-student-id="${student.uid}">✗ Reject</button>
        </div>
      </div>
    `;
  }).join('');

  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">Pending Students (${pendingStudents.length})</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${studentCards}
      </div>
    </div>
  `;
}

function renderRejectedContent() {
  const rejectedStudents = students.filter((student) => student.approvalStatus === 'rejected');
  
  if (rejectedStudents.length === 0) {
    contentArea.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">✓</div>
          <h3>No Rejected Students</h3>
          <p>No students have been rejected.</p>
        </div>
      </div>
    `;
    return;
  }

  const studentCards = rejectedStudents.map((student) => {
    const rejectDate = formatDate(student.updatedAt);
    const initials = (student.fullName || student.email || 'S').charAt(0).toUpperCase();
    
    return `
      <div class="student-card">
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
          <div class="student-name">${escapeHtml(student.fullName || student.email || 'Student')}</div>
          <div class="student-details">
            <span>Email: ${escapeHtml(student.email || 'N/A')}</span>
            <span>Phone: ${escapeHtml(student.phone || 'N/A')}</span>
            <span>UID: ${escapeHtml(student.uid || 'N/A')}</span>
            <span>Reject Date: ${rejectDate}</span>
            <span>Reason: ${escapeHtml(student.rejectionReason || 'No reason provided')}</span>
          </div>
        </div>
        <div class="student-actions">
          <button class="btn btn-success" data-action="approve" data-student-id="${student.uid}">✓ Approve Again</button>
          <button class="btn btn-danger" data-action="delete-student" data-student-id="${student.uid}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">Rejected Students (${rejectedStudents.length})</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${studentCards}
      </div>
    </div>
  `;
}

function renderManageStudentsContent() {
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      (student.fullName || '').toLowerCase().includes(searchLower) ||
      (student.email || '').toLowerCase().includes(searchLower) ||
      (student.phone || '').toLowerCase().includes(searchLower)
    );
  });

  const studentCards = filteredStudents.map((student) => {
    const payment = getPaymentForStudent(student.uid);
    const registrationDate = formatDate(student.createdAt);
    const status = student.approvalStatus || 'pending';
    const isPending = status === 'pending';
    const initials = (student.fullName || student.email || 'S').charAt(0).toUpperCase();
    
    return `
      <div class="student-card">
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
          <div class="student-name">${escapeHtml(student.fullName || student.email || 'Student')}</div>
          <div class="student-details">
            <span>Email: ${escapeHtml(student.email || 'N/A')}</span>
            <span>Phone: ${escapeHtml(student.phone || 'N/A')}</span>
            <span>UID: ${escapeHtml(student.uid || 'N/A')}</span>
            <span>Registered: ${registrationDate}</span>
            <span>Course: ${escapeHtml(student.course || 'N/A')}</span>
            <span>Status: <span class="status-badge ${status}">${status}</span></span>
          </div>
        </div>
        <div class="student-actions">
          ${isPending ? `<button class="btn btn-success" data-action="approve" data-student-id="${student.uid}">✓ Approve</button>` : ''}
          ${isPending ? `<button class="btn btn-danger" data-action="reject" data-student-id="${student.uid}">✗ Reject</button>` : ''}
          <button class="btn btn-secondary" data-action="view-profile" data-student-id="${student.uid}">View</button>
          <button class="btn btn-danger" data-action="delete-student" data-student-id="${student.uid}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">All Students (${students.length})</div>
        <div class="table-actions">
          <input type="text" class="search-input" placeholder="Search students..." value="${escapeHtml(searchQuery)}" id="searchInput">
          <button class="btn btn-secondary" id="exportBtn">Export CSV</button>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${studentCards || '<div class="empty-state">No students found</div>'}
      </div>
    </div>
  `;

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderManageStudentsContent();
  });

  document.getElementById('exportBtn')?.addEventListener('click', exportStudentsToCSV);
}

function renderPaymentVerificationContent() {
  const pendingPayments = payments.filter(payment => payment.paymentStatus === 'pending');
  
  if (pendingPayments.length === 0) {
    contentArea.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <h3>No Pending Payments</h3>
          <p>All payments have been verified.</p>
        </div>
      </div>
    `;
    return;
  }

  const paymentCards = pendingPayments.map((payment) => {
    const student = students.find(s => s.uid === payment.studentId || s.uid === payment.studentUid);
    const uploadDate = formatDate(payment.uploadDate);
    const initials = (student?.fullName || student?.email || 'S').charAt(0).toUpperCase();
    
    return `
      <div class="student-card">
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
          <div class="student-name">${escapeHtml(student?.fullName || student?.email || 'Unknown Student')}</div>
          <div class="student-details">
            <span>Email: ${escapeHtml(student?.email || 'N/A')}</span>
            <span>Phone: ${escapeHtml(student?.phone || 'N/A')}</span>
            <span>Transaction ID: ${escapeHtml(payment.transactionId || 'N/A')}</span>
            <span>Payment Method: ${escapeHtml(payment.paymentMethod || 'N/A')}</span>
            <span>Payment Date: ${uploadDate}</span>
            <span>Status: <span class="status-badge pending">${payment.paymentStatus || 'Pending'}</span></span>
          </div>
          ${payment?.screenshotUrl ? `
            <div style="margin-top: 1rem;">
              <strong>Payment Screenshot:</strong>
              <img src="${escapeHtml(payment.screenshotUrl)}" alt="Payment screenshot" class="payment-screenshot" />
            </div>
          ` : '<p style="margin-top: 1rem; color: var(--muted);">No screenshot</p>'}
        </div>
        <div class="student-actions">
          <button class="btn btn-success" data-action="verify-payment" data-student-id="${student?.uid || payment.studentId}" data-payment-id="${payment.id}">✓ Verify</button>
          <button class="btn btn-danger" data-action="reject-payment" data-student-id="${student?.uid || payment.studentId}" data-payment-id="${payment.id}">✗ Reject</button>
        </div>
      </div>
    `;
  }).join('');

  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">Pending Payments (${pendingPayments.length})</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${paymentCards}
      </div>
    </div>
  `;
}

function renderAnnouncementsContent() {
  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">Create Announcement</div>
        <button class="btn btn-primary" id="createAnnouncementBtn">+ New Announcement</button>
      </div>
      <div id="announcementsList" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="empty-state">Loading announcements...</div>
      </div>
    </div>
  `;

  document.getElementById('createAnnouncementBtn')?.addEventListener('click', () => {
    openModal(
      'Create Announcement',
      `
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="announcementTitle" placeholder="Announcement title">
        </div>
        <div class="form-group">
          <label class="form-label">Message</label>
          <textarea class="form-textarea" id="announcementMessage" placeholder="Announcement message"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Priority</label>
          <select class="form-select" id="announcementPriority">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Audience</label>
          <select class="form-select" id="announcementAudience">
            <option value="all">All Students</option>
            <option value="approved">Approved Students</option>
            <option value="online">Online Students</option>
            <option value="physical">Physical Students</option>
          </select>
        </div>
      `,
      `
        <button class="btn btn-secondary" id="cancelAnnouncement">Cancel</button>
        <button class="btn btn-primary" id="saveAnnouncement">Send</button>
      `
    );

    document.getElementById('cancelAnnouncement')?.addEventListener('click', closeModal);
    document.getElementById('saveAnnouncement')?.addEventListener('click', async () => {
      const title = document.getElementById('announcementTitle').value;
      const message = document.getElementById('announcementMessage').value;
      const priority = document.getElementById('announcementPriority').value;
      const audience = document.getElementById('announcementAudience').value;

      if (!title || !message) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        await createDoc('announcements', { title, message, priority, audience });
        closeModal();
        renderAnnouncementsContent();
      } catch (error) {
        alert('Failed to create announcement: ' + error.message);
      }
    });
  });

  loadAnnouncements();
}

async function loadAnnouncements() {
  try {
    const announcementsData = await readDocs('announcements');
    const list = document.getElementById('announcementsList');
    
    if (!announcementsData || announcementsData.length === 0) {
      list.innerHTML = '<div class="empty-state">No announcements found</div>';
      return;
    }

    list.innerHTML = announcementsData.map(announcement => `
      <div class="student-card">
        <div class="student-info">
          <div class="student-name">${escapeHtml(announcement.title)}</div>
          <div class="student-details">
            <span>Priority: <span class="status-badge ${announcement.priority}">${announcement.priority}</span></span>
            <span>Audience: ${escapeHtml(announcement.audience)}</span>
            <span>Date: ${formatDate(announcement.createdAt)}</span>
          </div>
          <p style="margin-top: 0.5rem; color: var(--muted);">${escapeHtml(announcement.message)}</p>
        </div>
        <div class="student-actions">
          <button class="btn btn-danger" data-action="delete-announcement" data-announcement-id="${announcement.id}">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

function renderMeetingsContent() {
  contentArea.innerHTML = `
    <div class="card">
      <div class="table-header">
        <div class="table-title">Meeting Links</div>
        <button class="btn btn-primary" id="createMeetingBtn">+ New Meeting</button>
      </div>
      <div id="meetingsList" style="display: flex; flex-direction: column; gap: 1rem;">
        <div class="empty-state">Loading meetings...</div>
      </div>
    </div>
  `;

  document.getElementById('createMeetingBtn')?.addEventListener('click', () => {
    openModal(
      'Create Meeting',
      `
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" class="form-input" id="meetingTitle" placeholder="Meeting title">
        </div>
        <div class="form-group">
          <label class="form-label">Meeting Link</label>
          <input type="url" class="form-input" id="meetingLink" placeholder="https://meet.google.com/xxx">
        </div>
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="meetingDate">
        </div>
        <div class="form-group">
          <label class="form-label">Time</label>
          <input type="time" class="form-input" id="meetingTime">
        </div>
        <div class="form-group">
          <label class="form-label">Meeting Type</label>
          <select class="form-select" id="meetingType">
            <option value="online">Online</option>
            <option value="physical">Physical</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Audience</label>
          <select class="form-select" id="meetingAudience">
            <option value="all">All Students</option>
            <option value="online">Online Students</option>
            <option value="physical">Physical Students</option>
          </select>
        </div>
      `,
      `
        <button class="btn btn-secondary" id="cancelMeeting">Cancel</button>
        <button class="btn btn-primary" id="saveMeeting">Save</button>
      `
    );

    document.getElementById('cancelMeeting')?.addEventListener('click', closeModal);
    document.getElementById('saveMeeting')?.addEventListener('click', async () => {
      const title = document.getElementById('meetingTitle').value;
      const link = document.getElementById('meetingLink').value;
      const date = document.getElementById('meetingDate').value;
      const time = document.getElementById('meetingTime').value;
      const type = document.getElementById('meetingType').value;
      const audience = document.getElementById('meetingAudience').value;

      if (!title || !link || !date || !time) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        await createDoc('meetingLinks', { title, link, date, time, type, audience });
        closeModal();
        renderMeetingsContent();
      } catch (error) {
        alert('Failed to create meeting: ' + error.message);
      }
    });
  });

  loadMeetings();
}

async function loadMeetings() {
  try {
    const meetingsData = await readDocs('meetingLinks');
    const list = document.getElementById('meetingsList');
    
    if (!meetingsData || meetingsData.length === 0) {
      list.innerHTML = '<div class="empty-state">No meetings found</div>';
      return;
    }

    list.innerHTML = meetingsData.map(meeting => `
      <div class="student-card">
        <div class="student-info">
          <div class="student-name">${escapeHtml(meeting.title)}</div>
          <div class="student-details">
            <span>Date: ${escapeHtml(meeting.date)}</span>
            <span>Time: ${escapeHtml(meeting.time)}</span>
            <span>Type: <span class="status-badge ${meeting.type}">${meeting.type}</span></span>
            <span>Audience: ${escapeHtml(meeting.audience)}</span>
          </div>
          <a href="${escapeHtml(meeting.link)}" target="_blank" style="margin-top: 0.5rem; color: var(--primary);">${escapeHtml(meeting.link)}</a>
        </div>
        <div class="student-actions">
          <button class="btn btn-danger" data-action="delete-meeting" data-meeting-id="${meeting.id}">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading meetings:', error);
  }
}

function exportStudentsToCSV() {
  const headers = ['Name', 'Email', 'Phone', 'Course', 'Payment Status', 'Approval Status', 'Registration Date'];
  const rows = students.map(student => {
    const payment = getPaymentForStudent(student.uid);
    return [
      student.fullName || student.email || 'N/A',
      student.email || 'N/A',
      student.phone || 'N/A',
      student.course || 'N/A',
      payment?.paymentStatus || 'N/A',
      student.approvalStatus || 'pending',
      formatDate(student.createdAt)
    ];
  });

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'students.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function initListeners() {
  try { if (studentsUnsub) studentsUnsub(); } catch (e) {}
  try { if (paymentsUnsub) paymentsUnsub(); } catch (e) {}

  studentsUnsub = await listenDocs('students', [], (docs) => {
    students = docs || [];
    renderStats();
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'approve') renderApprovalContent();
    if (currentPage === 'reject') renderRejectedContent();
    if (currentPage === 'students') renderManageStudentsContent();
    if (currentPage === 'payment') renderPaymentVerificationContent();
  });

  paymentsUnsub = await listenDocs('payments', [], (docs) => {
    payments = docs || [];
    if (currentPage === 'dashboard') renderDashboard();
    if (currentPage === 'approve') renderApprovalContent();
    if (currentPage === 'reject') renderRejectedContent();
    if (currentPage === 'students') renderManageStudentsContent();
    if (currentPage === 'payment') renderPaymentVerificationContent();
  });
}

async function updateApproval(studentId, status, reason = null) {
  const updateData = { approvalStatus: status, updatedAt: serverTimestamp() };
  if (reason) {
    updateData.rejectionReason = reason;
  }
  await updateDocById('students', studentId, updateData);
  const payment = getPaymentForStudent(studentId);
  if (payment) {
    await updateDocById('payments', payment.id, {
      paymentStatus: status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending'
    });
  }
}

async function updatePaymentStatus(paymentId, status) {
  await updateDocById('payments', paymentId, { paymentStatus: status });
}

async function renderContent(id) {
  currentPage = id;
  pageTitle.textContent = navItems.find((item) => item.id === id)?.label || 'Dashboard';
  renderNav();
  
  if (id === 'dashboard') {
    renderDashboard();
    return;
  }
  if (id === 'approve') {
    renderApprovalContent();
    return;
  }
  if (id === 'reject') {
    renderRejectedContent();
    return;
  }
  if (id === 'students') {
    renderManageStudentsContent();
    return;
  }
  if (id === 'payment') {
    renderPaymentVerificationContent();
    return;
  }
  if (id === 'announcements') {
    renderAnnouncementsContent();
    return;
  }
  if (id === 'meetings') {
    renderMeetingsContent();
    return;
  }
}

navList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  await renderContent(button.dataset.id);
});

contentArea.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  
  if (action === 'approve') {
    const studentId = button.dataset.studentId;
    await updateApproval(studentId, 'approved');
  }
  
  if (action === 'reject') {
    const studentId = button.dataset.studentId;
    const reason = prompt('Enter reason for rejection:');
    if (reason) {
      await updateApproval(studentId, 'rejected', reason);
    }
  }
  
  if (action === 'delete-student') {
    const studentId = button.dataset.studentId;
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      await deleteDocById('students', studentId);
      const payment = getPaymentForStudent(studentId);
      if (payment) {
        await deleteDocById('payments', payment.id);
      }
    }
  }
  
  if (action === 'verify-payment') {
    const studentId = button.dataset.studentId;
    const paymentId = button.dataset.paymentId;
    await updateApproval(studentId, 'approved');
    await updatePaymentStatus(paymentId, 'verified');
  }
  
  if (action === 'reject-payment') {
    const studentId = button.dataset.studentId;
    const paymentId = button.dataset.paymentId;
    const reason = prompt('Enter reason for rejection:');
    if (reason) {
      await updateApproval(studentId, 'rejected', reason);
      await updatePaymentStatus(paymentId, 'rejected');
    }
  }
  
  if (action === 'delete-announcement') {
    const announcementId = button.dataset.announcementId;
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteDocById('announcements', announcementId);
      renderAnnouncementsContent();
    }
  }
  
  if (action === 'delete-meeting') {
    const meetingId = button.dataset.meetingId;
    if (confirm('Are you sure you want to delete this meeting?')) {
      await deleteDocById('meetingLinks', meetingId);
      renderMeetingsContent();
    }
  }
  
  if (action === 'view-profile') {
    const studentId = button.dataset.studentId;
    const student = students.find(s => s.uid === studentId);
    if (student) {
      const payment = getPaymentForStudent(studentId);
      openModal(
        'Student Profile',
        `
          <div class="student-details" style="display: flex; flex-direction: column; gap: 0.5rem;">
            <strong>Name:</strong> ${escapeHtml(student.fullName || 'N/A')}
            <strong>Email:</strong> ${escapeHtml(student.email || 'N/A')}
            <strong>Phone:</strong> ${escapeHtml(student.phone || 'N/A')}
            <strong>UID:</strong> ${escapeHtml(student.uid || 'N/A')}
            <strong>Course:</strong> ${escapeHtml(student.course || 'N/A')}
            <strong>Approval Status:</strong> <span class="status-badge ${student.approvalStatus || 'pending'}">${student.approvalStatus || 'pending'}</span>
            <strong>Registration Date:</strong> ${formatDate(student.createdAt)}
            ${payment ? `
              <strong>Payment Method:</strong> ${escapeHtml(payment.paymentMethod || 'N/A')}
              <strong>Transaction ID:</strong> ${escapeHtml(payment.transactionId || 'N/A')}
              <strong>Payment Status:</strong> <span class="status-badge ${payment.paymentStatus || 'pending'}">${payment.paymentStatus || 'pending'}</span>
            ` : '<strong>Payment:</strong> No payment information'}
          </div>
        `,
        `<button class="btn btn-secondary" id="closeProfile">Close</button>`
      );
      document.getElementById('closeProfile')?.addEventListener('click', closeModal);
    }
  }
});

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

renderNav();
renderStats();
initListeners();
renderContent('dashboard');

window.addEventListener('beforeunload', () => {
  try { if (studentsUnsub) studentsUnsub(); } catch (e) {}
  try { if (paymentsUnsub) paymentsUnsub(); } catch (e) {}
});
