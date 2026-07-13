export function renderHomePage(container) {
  container.innerHTML = `
    <section class="hero">
      <div>
        <span class="badge">Modern learning platform</span>
        <h1>Deliver impactful learning experiences.</h1>
        <p>Northstar LMS brings instructors, students, and administrators together in one streamlined environment.</p>
        <div class="hero-actions">
          <a class="primary-btn" href="./pages/courses.html">Browse courses</a>
          <a class="secondary-btn" href="./pages/about.html">Learn more</a>
        </div>
      </div>
      <div class="panel">
        <h3>At a glance</h3>
        <div class="grid grid-2">
          <div class="card metric"><strong>24/7</strong><span>Access</span></div>
          <div class="card metric"><strong>100%</strong><span>Responsive</span></div>
          <div class="card metric"><strong>3</strong><span>Roles</span></div>
          <div class="card metric"><strong>Firebase</strong><span>Auth</span></div>
        </div>
      </div>
    </section>
  `;
}

export function renderLoginPage(container, onSubmit) {
  container.innerHTML = `
    <section class="form-card">
      <h3>Welcome back</h3>
      <p>Access your course dashboard.</p>
      <form id="login-form">
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" required /></label>
        <button class="primary-btn" type="submit">Sign in</button>
        <a href="./index.html?register=1" class="status">Create an account</a>
      </form>
      <div class="status" id="status"></div>
    </section>
  `;
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    await onSubmit(data.get('email'), data.get('password'));
  });
}

export function renderRegisterPage(container, onSubmit) {
  container.innerHTML = `
    <section class="form-card">
      <h3>Create account</h3>
      <p>Join Northstar LMS today.</p>
      <form id="register-form">
        <label>Email<input type="email" name="email" required /></label>
        <label>Password<input type="password" name="password" required /></label>
        <button class="primary-btn" type="submit">Register</button>
        <a href="./index.html" class="status">Back to login</a>
      </form>
      <div class="status" id="status"></div>
    </section>
  `;
  const form = document.getElementById('register-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    await onSubmit(data.get('email'), data.get('password'));
  });
}

export function renderAdminPage(container) {
  container.innerHTML = `
    <section class="grid grid-3">
      <div class="card"><h3>Admin Overview</h3><p>Manage courses, teachers, and student activity in one place.</p></div>
      <div class="card"><h3>Pending Approvals</h3><p>Review new enrolments and content requests.</p></div>
      <div class="card"><h3>System Health</h3><p>Monitor platform performance and user engagement.</p></div>
    </section>
  `;
}

export function renderAboutPage(container) {
  container.innerHTML = `
    <section class="hero">
      <div>
        <span class="badge">Purpose built</span>
        <h1>Learning that scales with your organization.</h1>
        <p>Northstar LMS supports every role with a modular, responsive experience.</p>
      </div>
      <div class="panel">
        <h3>Why it works</h3>
        <div class="list">
          <div class="list-item"><span>Responsive UI</span><strong>✓</strong></div>
          <div class="list-item"><span>Firebase auth</span><strong>✓</strong></div>
          <div class="list-item"><span>Dark mode</span><strong>✓</strong></div>
        </div>
      </div>
    </section>
  `;
}

export function renderCoursesPage(container) {
  container.innerHTML = `
    <section class="grid grid-3">
      <div class="card"><h3>Product Design</h3><p>Learn UI systems, interaction patterns, and design thinking.</p></div>
      <div class="card"><h3>Frontend Development</h3><p>Build modern interfaces using the web platform and best practices.</p></div>
      <div class="card"><h3>Data Fundamentals</h3><p>Understand analytics, reporting, and data-driven decisions.</p></div>
    </section>
  `;
}

export function renderAssignmentsPage(container) {
  container.innerHTML = `
    <section class="table-card">
      <h3>Upcoming assignments</h3>
      <div class="list">
        <div class="list-item"><span>Design critique</span><span class="badge">Due tomorrow</span></div>
        <div class="list-item"><span>JavaScript challenge</span><span class="badge">Due Friday</span></div>
      </div>
    </section>
  `;
}

export function renderSupportPage(container) {
  container.innerHTML = `
    <section class="form-card">
      <h3>Contact support</h3>
      <p>Reach out for account, course, or platform help.</p>
      <form>
        <label>Subject<input type="text" /></label>
        <label>Message<textarea rows="4"></textarea></label>
        <button class="primary-btn" type="button">Send</button>
      </form>
    </section>
  `;
}

export function renderTeacherPage(container) {
  container.innerHTML = `
    <section class="grid grid-2">
      <div class="card"><h3>Teaching Dashboard</h3><p>Prepare lessons, review submissions, and track course progress.</p></div>
      <div class="card"><h3>Schedule</h3><p>Upcoming live sessions and office hours.</p></div>
    </section>
  `;
}

export function renderStudentPage(container) {
  container.innerHTML = `
    <section class="grid grid-2">
      <div class="card"><h3>My Courses</h3><p>Continue your current learning path with a single click.</p></div>
      <div class="card"><h3>Assignments</h3><p>Stay on top of deadlines and submissions.</p></div>
    </section>
  `;
}
