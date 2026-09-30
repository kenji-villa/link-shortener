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
  searchInput:  $('#searchInput'),
  filterSelect: $('#filterSelect'),
  linksMeta:    $('#linksMeta'),
  noResults:    $('#noResults'),

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
  // =====================================================
// PHASE 5 — Delegated table actions (hardened)
// - Registered ONCE at top level
// - Stops propagation so no double-handling
// - Guard flag prevents re-entry from rapid clicks
// =====================================================
let _handlingClick = false;

els.linksBody.addEventListener('click', async (e) => {
  if (_handlingClick) return;

  const actionBtn = e.target.closest('[data-action]');
  const shortLink = e.target.closest('.short-link');

  // --- Action buttons (Copy / Open / Delete) ---
  if (actionBtn) {
    e.preventDefault();
    e.stopPropagation();           // ← prevent any other handler from firing
    e.stopImmediatePropagation();  // ← belt and suspenders

    _handlingClick = true;
    try {
      const { action, id } = actionBtn.dataset;
      const link = links.find(l => l.id === id);
      if (!link) return;

      if (action === 'copy') {
        const shortUrl = `${SHORT_DOMAIN}/${link.shortCode}`;
        const ok = await copyToClipboard(shortUrl);
        showToast(
          ok ? 'Copied to clipboard!' : 'Could not copy.',
          ok ? 'success' : 'error',
          1800
        );
        return;
      }

      if (action === 'open') {
        incrementClicks(link.id);
        window.open(link.originalUrl, '_blank', 'noopener');
        renderLinks();
        showToast('Opening link…', 'info', 1500);
        if ($('#page-analytics').classList.contains('is-active')) renderAnalytics();
        return;
      }

      if (action === 'delete') {
        if (confirm(`Delete short link "${link.shortCode}"? This cannot be undone.`)) {
          deleteLink(link.id);
          links = getLinks();
          renderLinks();
          renderAnalytics();
          showToast('Link deleted.', 'success', 1800);
        }
        return;
      }
    } finally {
      // Release the guard on the next tick
      setTimeout(() => { _handlingClick = false; }, 0);
    }
    return;
  }

  // --- Short-link anchor click (the pill in the table) ---
  if (shortLink) {
    e.preventDefault();
    e.stopPropagation();

    _handlingClick = true;
    try {
      const id = shortLink.dataset.id;
      const link = links.find(l => l.id === id);
      if (link) {
        incrementClicks(link.id);
        window.open(link.originalUrl, '_blank', 'noopener');
        renderLinks();
        if ($('#page-analytics').classList.contains('is-active')) renderAnalytics();
      }
    } finally {
      setTimeout(() => { _handlingClick = false; }, 0);
    }
  }
});


// =====================================================
// PHASE 7 — Listeners for search & filter
// =====================================================
els.searchInput.addEventListener('input', (e) => {
  filterState.query = e.target.value;
  renderLinks();
});

els.filterSelect.addEventListener('change', (e) => {
  filterState.range = e.target.value;
  renderLinks();
});


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
// PHASE 5 helpers — clipboard, time, click tracking
// =====================================================

/**
 * Copy text to clipboard with a legacy fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  // Modern API (requires HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back:', err);
    }
  }

  // Fallback for insecure contexts / older browsers
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
}

/**
 * Human-readable relative time.
 * @param {number} ts
 * @returns {string}
 */
function relativeTime(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 45)   return 'just now';
  if (min < 60)   return `${min} min ago`;
  if (hr  < 24)   return `${hr} hr ago`;
  if (day === 1)  return 'yesterday';
  if (day < 7)    return `${day} days ago`;

  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Increment clicks for a given link id and persist.
 * @param {string} id
 */
function incrementClicks(id) {
  const stored = loadLinks();
  const target = stored.find(l => l.id === id);
  if (!target) return;
  target.clicks = (target.clicks || 0) + 1;
  saveLinks(stored);
  links = stored;
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

els.copyBtn.addEventListener('click', async () => {
  const shortUrl = els.resultLink.dataset.shortUrl || els.resultLink.textContent;
  const ok = await copyToClipboard(shortUrl);

  if (ok) {
    showToast('Copied to clipboard!', 'success', 1800);
    // Button feedback
    const original = els.copyBtn.textContent;
    els.copyBtn.textContent = 'Copied!';
    els.copyBtn.disabled = true;
    setTimeout(() => {
      els.copyBtn.textContent = original;
      els.copyBtn.disabled = false;
    }, 1400);
  } else {
    showToast('Could not copy — please copy manually.', 'error');
  }
});

// Track clicks when the user opens the short link from the result card
els.resultLink.addEventListener('click', (e) => {
  e.preventDefault();
  const shortUrl = els.resultLink.dataset.shortUrl || els.resultLink.textContent;
  const link = links.find(l => `${SHORT_DOMAIN}/${l.shortCode}` === shortUrl);
  if (link) {
    incrementClicks(link.id);
    // Open the original URL in a new tab
    window.open(link.originalUrl, '_blank', 'noopener');
    showToast('Opening link…', 'info', 1500);
    // If My Links is visible, refresh it
    if ($('#page-links').classList.contains('is-active')) renderLinks();
    if ($('#page-analytics').classList.contains('is-active')) renderAnalytics();
  } else {
    // Fallback — open whatever href is set
    window.open(els.resultLink.href, '_blank', 'noopener');
  }
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

// =====================================================
// PHASE 7 — Search & filtering
// =====================================================

/** Current filter state (source of truth for renderLinks). */
const filterState = {
  query: '',
  range: 'all', // 'all' | 'today' | 'week' | 'month'
};

/**
 * Returns the start-of-range timestamp for the current filter.
 * @returns {number|null} null means "no time filter"
 */
function getRangeStart() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (filterState.range) {
    case 'today':
      return startOfToday;
    case 'week': {
      // Last 7 days (rolling) — friendlier than "start of calendar week"
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 6);
      return d.getTime();
    }
    case 'month': {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 29);
      return d.getTime();
    }
    default:
      return null;
  }
}

/**
 * Apply search + filter to a list of links.
 * @param {ShortLink[]} all
 * @returns {ShortLink[]}
 */
function applyFilters(all) {
  const q = filterState.query.trim().toLowerCase();
  const rangeStart = getRangeStart();

  return all.filter(link => {
    // Time range
    if (rangeStart !== null && link.createdAt < rangeStart) return false;

    // Text search across original URL and short code
    if (q) {
      const haystack = `${link.originalUrl} ${link.shortCode}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function renderLinks() {
  const all = getLinks();
  links = all; // keep global in sync

  const filtered = applyFilters(all);
  const hasAny = all.length > 0;
  const hasMatches = filtered.length > 0;
  const isFiltering = filterState.query.trim() !== '' || filterState.range !== 'all';

  // ---- Choose which UI state to show ----
  if (!hasAny) {
    // No links at all
    els.emptyState.hidden = false;
    els.noResults.hidden = true;
    els.tableWrap.hidden = true;
    els.linksMeta.hidden = true;
    return;
  }

  if (!hasMatches) {
    // Links exist but none match
    els.emptyState.hidden = true;
    els.noResults.hidden = false;
    els.tableWrap.hidden = true;
    els.linksMeta.hidden = true;
    return;
  }

  // Has matches → show table
  els.emptyState.hidden = true;
  els.noResults.hidden = true;
  els.tableWrap.hidden = false;

  // Meta line: show only while filtering
  if (isFiltering) {
    els.linksMeta.hidden = false;
    els.linksMeta.textContent = `Showing ${filtered.length} of ${all.length} link${all.length === 1 ? '' : 's'}`;
  } else {
    els.linksMeta.hidden = true;
  }

  // Render rows (unchanged markup from Phase 6)
  els.linksBody.innerHTML = filtered.map(link => {
    const shortUrl = `${SHORT_DOMAIN}/${link.shortCode}`;
    const clickBadgeClass = link.clicks > 0 ? 'badge badge--active' : 'badge';

    return `
      <tr data-id="${link.id}">
        <td title="${link.originalUrl}">
          <span class="cell-original">${truncateUrl(link.originalUrl)}</span>
        </td>
        <td>
          <a href="${link.originalUrl}"
             class="short-link"
             data-short="${shortUrl}"
             data-id="${link.id}"
             rel="noopener">
            ${link.shortCode}
          </a>
        </td>
        <td><span class="${clickBadgeClass}">${link.clicks}</span></td>
        <td><span class="cell-date" title="${new Date(link.createdAt).toLocaleString()}">${relativeTime(link.createdAt)}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="copy"   data-id="${link.id}" title="Copy"   aria-label="Copy">📋</button>
            <button class="icon-btn" data-action="open"   data-id="${link.id}" title="Open"   aria-label="Open">↗</button>
            <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${link.id}" title="Delete" aria-label="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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