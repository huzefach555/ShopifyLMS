export function renderHeader(container, state, toggleTheme, onAuth) {
  const currentPath = window.location.pathname;
  const isNestedRoute = /\/(pages|admin|teacher|student)\//.test(currentPath);
  const assetPrefix = isNestedRoute ? '../' : './';
  const homeHref = isNestedRoute ? '../index.html' : './index.html';
  const pagesHref = (page) => (isNestedRoute ? `../pages/${page}` : `./pages/${page}`);

  container.innerHTML = `
    <div class="brand">
      <img src="${assetPrefix}assets/logo.svg" alt="logo" />
      <span>Northstar LMS</span>
    </div>
    <nav class="nav-links">
      <a href="${homeHref}" class="active">Home</a>
      <a href="${pagesHref('courses.html')}">Courses</a>
      <a href="${pagesHref('about.html')}">About</a>
      <button class="ghost-btn" data-action="theme">${state.theme === 'light' ? '🌙' : '☀️'}</button>
      <button class="primary-btn" data-action="auth">${state.user ? 'Logout' : 'Login'}</button>
    </nav>
  `;
  container.querySelector('[data-action="theme"]').addEventListener('click', toggleTheme);
  container.querySelector('[data-action="auth"]').addEventListener('click', onAuth);
}

export function renderSidebar(container, state, path) {
  const currentPath = window.location.pathname;
  const isNestedRoute = /\/(pages|admin|teacher|student)\//.test(currentPath);
  const homeHref = isNestedRoute ? '../index.html' : './index.html';
  const pagesHref = (page) => (isNestedRoute ? `../pages/${page}` : `./pages/${page}`);
  const items = [
    { label: 'Dashboard', href: homeHref },
    { label: 'Courses', href: pagesHref('courses.html') },
    { label: 'Assignments', href: pagesHref('assignments.html') },
    { label: 'Support', href: pagesHref('support.html') },
  ];
  container.innerHTML = `
    <div class="sidebar-card">
      <h3>${state.user ? 'Welcome back' : 'Start learning'}</h3>
      <p>${state.user ? state.user.email : 'Sign in to access your learning dashboard.'}</p>
      <div class="quick-links">
        ${items.map((item) => `<a href="${item.href}" class="${path === item.href.split('/').pop() ? 'active' : ''}">${item.label}</a>`).join('')}
      </div>
    </div>
  `;
}

export function renderFooter(container) {
  container.innerHTML = '<span>© 2026 Northstar LMS. Built with vanilla JavaScript and Firebase.</span>';
}
