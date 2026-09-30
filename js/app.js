/* =====================================================
   LinkShortener — Phase 1-4
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

  // My Links
  emptyState:   $('#emptyState'),
  tableWrap:    $('#tableWrap'),
  linksBody:    $('#linksBody'),

  // Analytics
  totalLinks:   $('#totalLinks'),
  totalClicks:  $('#totalClicks'),

  toastContainer: $('#toastContainer'),
};

// =====================================================
// Navigation
// =====================================================
function switchPage(pageName) {
  els.pages.forEach(p => p.classList.toggle('is-active', p.id === `page-${pageName}`));
  els.navLinks.forEach(b => b.classList.toggle('is-active', b.dataset.page === pageName));
  els.nav.classList.remove('is-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Refresh page-specific data
  if (pageName === 'links') renderLinks();
  if (pageName === 'analytics') renderAnalytics();
}

els.navLinks.forEach(btn =>
  btn.addEventListener('click', () => switchPage(btn.dataset.page))
);

els.menuToggle.addEventListener('click', () => {
  els.nav.classList.toggle('is-open');
});

// =====================================================
// Theme toggle
// =====================================================
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  $$('input[name="theme"]').forEach(r => (r.checked = r.value === theme));
}
els.themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});
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
function validateUrl(raw) {
  const value = raw.trim();

  if (!value) return { valid: false, error: 'Please enter a URL.' };
  if (value.length > 2048) return { valid: false, error: 'URL is too long (max 2048 characters).' };

  let candidate = value;
  if (!/^https?:\/\//i.test(candidate)) candidate = 'https://' + candidate;

  let parsed;
  try { parsed = new URL(candidate); }
  catch { return { valid: false, error: "That doesn't look like a valid URL." }; }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http and https URLs are supported.' };
  }

  const host = parsed.hostname;
  if (!host.includes('.') || !/\.[a-z]{2,}$/i.test(host)) {
    return { valid: false, error: 'Please enter a valid domain (e.g. example.com).' };
  }

  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(host)) {
    return { valid: false, error: 'Local addresses are not allowed.' };
  }

  return { valid: true, url: parsed.href };
}

// =====================================================
// PHASE 3: Short code generation
// =====================================================
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 5;
const SHORT_DOMAIN = 'short.ly';

/**
 * Generate a random base62 code of given length.
 * @param {number} length
 * @returns {string}
 */
function generateCode(length = CODE_LENGTH) {
  let code = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % BASE62.length];
  }
  return code;
}

/**
 * Generate a code guaranteed not to collide with existing links.
 * @param {Array<{shortCode:string}>} existingLinks
 * @returns {string}
 */
function generateUniqueCode(existingLinks) {
  const taken = new Set(existingLinks.map(l => l.shortCode));
  // Cap attempts to avoid infinite loop in pathological cases
  for (let i = 0; i < 1000; i++) {
    const code = generateCode();
    if (!taken.has(code)) return code;
  }
  // Extremely unlikely fallback: extend length
  return generateCode(CODE_LENGTH + 2);
}

// =====================================================
// PHASE 4: LocalStorage persistence
// =====================================================
const STORAGE_KEY = 'linkshortener.links.v1';

/**
 * @typedef {Object} ShortLink
 * @property {string} id           - internal unique id
 * @property {string} originalUrl  - normalized long URL
 * @property {string} shortCode    - base62 short code
 * @property {number} clicks       - click counter
 * @property {number} createdAt    - timestamp (ms)
 * @property {number|null} expiresAt - timestamp (ms) or null
 */

/** @returns {ShortLink[]} */
function loadLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load links:', err);
    showToast('Could not read saved links.', 'error');
    return [];
  }
}

/** @param {ShortLink[]} links */
function saveLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (err) {
    console.error('Failed to save links:', err);
    showToast('Storage is full or unavailable.', 'error');
  }
}

/** @returns {ShortLink[]} */
function getLinks() {
  return loadLinks();
}

/** @param {ShortLink} link */
function addLink(link) {
  const links = loadLinks();
  links.unshift(link); // newest first
  saveLinks(links);
  return link;
}

/** @param {string} id */
function deleteLink(id) {
  const links = loadLinks().filter(l => l.id !== id);
  saveLinks(links);
}

/** Clears everything */
function clearAllLinks() {
  localStorage.removeItem(STORAGE_KEY);
}

// =====================================================
// Store (in-memory copy for rendering)
// =====================================================
let links = getLinks();

// =====================================================
// Form handling
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

  handleValidUrl(result.url);
});

els.urlInput.addEventListener('input', () => {
  if (els.urlError.textContent) {
    els.urlError.textContent = '';
    els.urlInput.classList.remove('is-invalid');
  }
});

/**
 * Create + persist a short link and display the result.
 * @param {string} validUrl
 */
function handleValidUrl(validUrl) {
  // Duplicate check — same original URL returns existing link
  const existing = links.find(l => l.originalUrl === validUrl);
  if (existing) {
    showResult(existing);
    showToast('This URL is already shortened.', 'info');
    return;
  }

  // Expiration (default from settings; we'll wire settings in Phase 9, keep 'never' for now)
  const expiresAt = null;

  const code = generateUniqueCode(links);
  /** @type {ShortLink} */
  const link = {
    id: crypto.randomUUID(),
    originalUrl: validUrl,
    shortCode: code,
    clicks: 0,
    createdAt: Date.now(),
    expiresAt,
  };

  links.unshift(link);
  addLink(link);

  showResult(link);
  showToast('Short URL created!', 'success');

  // If user is on My Links, refresh it
  if ($('#page-links').classList.contains('is-active')) renderLinks();
}

function showResult(link) {
  const shortUrl = `${SHORT_DOMAIN}/${link.shortCode}`;
  els.resultLink.textContent = shortUrl;
  els.resultLink.href = link.originalUrl; // opening target wired in Phase 5
  els.resultLink.dataset.shortUrl = shortUrl;
  els.result.hidden = false;

  // Clear input & focus for next entry
  els.urlInput.value = '';
  els.urlInput.focus();
}

els.copyBtn.addEventListener('click', () => {
  showToast('Copy logic arrives in Phase 5.', 'info');
});

// =====================================================
// PHASE 4 (cont.): Render links table
// =====================================================
function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function truncateUrl(url, max = 40) {
  const clean = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

function renderLinks() {
  links = getLinks();

  if (links.length === 0) {
    els.emptyState.hidden = false;
    els.tableWrap.hidden = true;
    return;
  }

  els.emptyState.hidden = true;
  els.tableWrap.hidden = false;

  els.linksBody.innerHTML = links.map(link => `
    <tr data-id="${link.id}">
      <td title="${link.originalUrl}">${truncateUrl(link.originalUrl)}</td>
      <td><a href="${link.originalUrl}" target="_blank" rel="noopener">${link.shortCode}</a></td>
      <td>${link.clicks}</td>
      <td>${formatDate(link.createdAt)}</td>
      <td></td>
    </tr>
  `).join('');
}

// =====================================================
// PHASE 4 (cont.): Analytics (basic counts for now)
// =====================================================
function renderAnalytics() {
  links = getLinks();
  els.totalLinks.textContent = links.length;
  els.totalClicks.textContent = links.reduce((sum, l) => sum + l.clicks, 0);
}

// =====================================================
// Init
// =====================================================
switchPage('shorten');
renderLinks();
renderAnalytics();

console.log(
  `%c🔗 LinkShortener — Phases 1-4 ready (${links.length} links in storage)`,
  'color:#4f46e5;font-weight:bold;'
);