const root = document.documentElement;
const toggle = document.querySelector('.theme-toggle');
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const form = document.querySelector('.form-card');
const reveals = document.querySelectorAll('.reveal');
const state = { theme: localStorage.getItem('theme') || 'light' };

function applyTheme() {
  root.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
  if (toggle) toggle.textContent = state.theme === 'light' ? '☀' : '☾';
}

function initReveal() {
  if (!('IntersectionObserver' in window) || !reveals.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.15 });
  reveals.forEach((item) => observer.observe(item));
}

if (toggle) {
  toggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
  });
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (!button) return;
    button.textContent = 'Application Sent';
    button.disabled = true;
    window.setTimeout(() => {
      button.textContent = 'Apply Now';
      button.disabled = false;
      form.reset();
    }, 1800);
  });
}

applyTheme();
initReveal();
