/* =====================================================
   LinkShortener — Phase 1 (UI) + Phase 2 (validation)
   ===================================================== */

// ---------- DOM helpers ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- Element refs ----------
const els = {
  nav:          $('#nav'),
  navLinks:     $$('.nav__link'),
  pages:        $$('.page'),
  menuToggle:   $('#menuToggle'),
  themeToggle:  $('#themeToggle'),

  shortenForm:  $('#shortenForm'),
  urlInput:     $('#urlInput'),
  urlError:     $('#urlError'),
  result:       $('#result'),
  resultLink:   $('#resultLink'),
  copyBtn:      $('#copyBtn'),

  toastContainer: $('#toastContainer'),
};

// =====================================================
// Navigation
// =====================================================
function switchPage(pageName) {
  els.pages.forEach(p => p.classList.toggle('is-active', p.id === `page-${pageName}`));
  els.navLinks.forEach(b => b.classList.toggle('is-active', b.dataset.page === pageName));
  els.nav.classList.remove('is-open'); // close mobile nav
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

els.navLinks.forEach(btn =>
  btn.addEventListener('click', () => switchPage(btn.dataset.page))
);

els.menuToggle.addEventListener('click', () => {
  els.nav.classList.toggle('is-open');
});

// =====================================================
// Theme toggle (minimal for Phase 1 — full logic in Phase 9)
// =====================================================
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  const radios = $$('input[name="theme"]');
  radios.forEach(r => (r.checked = r.value === theme));
}

els.themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

// Default theme
applyTheme('light');

// =====================================================
// Toast notifications
// =====================================================
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.25s, transform 0.25s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// =====================================================
// PHASE 2: URL Validation
// =====================================================

/**
 * Validates and normalizes a URL string.
 * @param {string} raw
 * @returns {{ valid: true, url: string } | { valid: false, error: string }}
 */
function validateUrl(raw) {
  const value = raw.trim();

  if (!value) {
    return { valid: false, error: 'Please enter a URL.' };
  }

  if (value.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters).' };
  }

  // Add https:// if the user omitted the protocol
  let candidate = value;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, error: 'That doesn\'t look like a valid URL.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http and https URLs are supported.' };
  }

  // Hostname must contain a dot and a valid TLD-ish ending
  const host = parsed.hostname;
  if (!host.includes('.') || !/\.[a-z]{2,}$/i.test(host)) {
    return { valid: false, error: 'Please enter a valid domain (e.g. example.com).' };
  }

  // Block obviously local addresses (optional; remove if not desired)
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(host)) {
    return { valid: false, error: 'Local addresses are not allowed.' };
  }

  return { valid: true, url: parsed.href };
}

// =====================================================
// Form handling (Phase 1 wiring + Phase 2 validation)
// =====================================================
els.shortenForm.addEventListener('submit', (e) => {
  e.preventDefault();
  els.urlError.textContent = '';
  els.urlInput.classList.remove('is-invalid');

  const result = validateUrl(els.urlInput.value);

  if (!result.valid) {
    els.urlError.textContent = result.error;
    els.urlInput.classList.add('is-invalid');
    showToast(result.error, 'error');
    return;
  }

  // Phase 3 will replace this with real short-code generation
  handleValidUrl(result.url);
});

// Clear error when typing
els.urlInput.addEventListener('input', () => {
  if (els.urlError.textContent) {
    els.urlError.textContent = '';
    els.urlInput.classList.remove('is-invalid');
  }
});

/**
 * Placeholder for Phase 3 — for now, we just show the validated URL.
 */
function handleValidUrl(validUrl) {
  // Temporarily just demo: show a fake short code
  const fakeCode = Math.random().toString(36).slice(2, 7);
  const shortUrl = `short.ly/${fakeCode}`;

  els.resultLink.textContent = shortUrl;
  els.resultLink.href = validUrl; // for now, opens the original
  els.result.hidden = false;

  showToast('URL validated! Short-code logic comes in Phase 3.', 'success');
  console.log('✅ Valid URL:', validUrl);
}

// Copy button placeholder (real logic in Phase 5)
els.copyBtn.addEventListener('click', () => {
  showToast('Copy logic arrives in Phase 5.', 'info');
});

// =====================================================
// Init
// =====================================================
switchPage('shorten');
console.log('%c🔗 LinkShortener — Phase 1 & 2 ready', 'color:#4f46e5;font-weight:bold;');