/* =====================================================
   LinkShortener — Phases 1–9
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

  // Shorten
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
  totalLinks:    $('#totalLinks'),
  totalClicks:   $('#totalClicks'),
  clicksToday:   $('#clicksToday'),
  linksDelta:    $('#linksDelta'),
  clicksDelta:   $('#clicksDelta'),
  todayDelta:    $('#todayDelta'),
  topLink:       $('#topLink'),
  topLinkMeta:   $('#topLinkMeta'),
  topLinkGlyph:  $('#topLinkGlyph'),
  linksSpark:    $('#linksSpark'),
  clicksSpark:   $('#clicksSpark'),
  todaySpark:    $('#todaySpark'),
  chartSummary:  $('#chartSummary'),
  rangeTabs:     $('#rangeTabs'),
  areaChart:     $('#areaChart'),
  chartAxis:     $('#chartAxis'),
  chartEmpty:    $('#chartEmpty'),
  leaderboard:   $('#leaderboard'),
  leaderboardEmpty: $('#leaderboardEmpty'),

  // Settings
  exportBtn:   $('#exportBtn'),
  importBtn:   $('#importBtn'),
  importFile:  $('#importFile'),
  clearBtn:    $('#clearBtn'),

  // Toast
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

  if (pageName === 'links') renderLinks();
  if (pageName === 'analytics') renderAnalytics();
}

els.navLinks.forEach(btn =>
  btn.addEventListener('click', () => switchPage(btn.dataset.page))
);

els.menuToggle.addEventListener('click', () => {
  els.nav.classList.toggle('is-open');
});

// Close mobile nav on outside click
document.addEventListener('click', (e) => {
  if (!els.nav.classList.contains('is-open')) return;
  if (els.nav.contains(e.target)) return;
  if (els.menuToggle.contains(e.target)) return;
  els.nav.classList.remove('is-open');
});

// Close mobile nav on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    els.nav.classList.remove('is-open');
  }
});

// =====================================================
// PHASE 9 — Settings storage
// (Declared early — theme toggle and other code depend on `settings`)
// =====================================================
const SETTINGS_KEY = 'linkshortener.settings.v1';

const DEFAULT_SETTINGS = {
  theme: 'light',         // 'light' | 'dark'
  defaultExpiry: 'never', // 'never' | '7' | '30'
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.error('Failed to load settings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(patch) {
  const current = loadSettings();
  const merged = { ...current, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
  return merged;
}

let settings = loadSettings();

// =====================================================
// Theme toggle
// =====================================================
function applyTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  $$('input[name="theme"]').forEach(r => (r.checked = r.value === theme));
  if (persist) {
    settings = saveSettings({ theme });
  }
}

els.themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

applyTheme(settings.theme || 'light');

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
// PHASE 9 — Settings page listeners
// =====================================================

// Apply saved settings to the UI on load
(function initSettingsUI() {
  $$('input[name="theme"]').forEach(r => {
    r.checked = r.value === (settings.theme || 'light');
  });
  $$('input[name="expiry"]').forEach(r => {
    r.checked = r.value === (settings.defaultExpiry || 'never');
  });
})();

// Theme radio changes
$$('input[name="theme"]').forEach(r => {
  r.addEventListener('change', (e) => {
    if (e.target.checked) applyTheme(e.target.value);
  });
});

// Expiry radio changes
$$('input[name="expiry"]').forEach(r => {
  r.addEventListener('change', (e) => {
    if (!e.target.checked) return;
    settings = saveSettings({ defaultExpiry: e.target.value });
    showToast(`Default expiry set to ${labelForExpiry(e.target.value)}.`, 'success', 1800);
  });
});

function labelForExpiry(v) {
  return v === 'never' ? 'Never' : `${v} days`;
}

// Export
els.exportBtn.addEventListener('click', () => {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    links: getLinks(),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkshortener-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showToast('Data exported.', 'success', 1800);
});

// Import
els.importBtn.addEventListener('click', () => {
  els.importFile.value = '';
  els.importFile.click();
});

els.importFile.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const incoming = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.links)
        ? parsed.links
        : null;

    if (!incoming) {
      showToast('Invalid backup file.', 'error');
      return;
    }

    const existing = getLinks();
    const choice = confirm(
      `Import ${incoming.length} link(s).\n\n` +
      `Click OK to MERGE with your ${existing.length} existing link(s).\n` +
      `Click Cancel to choose REPLACE...`
    );

    let replace = false;
    if (!choice) {
      replace = confirm(
        `REPLACE all ${existing.length} existing link(s) with ${incoming.length} imported link(s)?\n\n` +
        `Click OK to replace. Click Cancel to abort.`
      );
      if (!replace) {
        showToast('Import cancelled.', 'info', 1500);
        return;
      }
    }

    const sanitized = incoming
      .filter(l => l && typeof l === 'object')
      .map(l => ({
        id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
        originalUrl: String(l.originalUrl || ''),
        shortCode: String(l.shortCode || '').slice(0, 12),
        clicks: Number.isFinite(l.clicks) ? l.clicks : 0,
        clicksLog: Array.isArray(l.clicksLog) ? l.clicksLog.filter(Number.isFinite) : [],
        createdAt: Number.isFinite(l.createdAt) ? l.createdAt : Date.now(),
        expiresAt: l.expiresAt ?? null,
      }))
      .filter(l => l.originalUrl && l.shortCode);

    let final;
    if (replace) {
      final = sanitized;
    } else {
      const seen = new Set(existing.map(l => l.shortCode));
      final = [...existing];
      for (const l of sanitized) {
        if (seen.has(l.shortCode)) continue;
        final.push(l);
        seen.add(l.shortCode);
      }
    }

    saveLinks(final);
    links = final;

    if (parsed && typeof parsed.settings === 'object' && parsed.settings) {
      settings = saveSettings(parsed.settings);
      applyTheme(settings.theme || 'light');
      $$('input[name="expiry"]').forEach(r => {
        r.checked = r.value === settings.defaultExpiry;
      });
    }

    renderLinks();
    renderAnalytics();
    showToast(`Imported ${sanitized.length} link(s).`, 'success');
  } catch (err) {
    console.error('Import failed:', err);
    showToast('Could not read that file.', 'error');
  }
});

// Clear All
els.clearBtn.addEventListener('click', () => {
  const count = getLinks().length;
  if (count === 0) {
    showToast('Nothing to clear.', 'info', 1500);
    return;
  }

  const ok = confirm(
    `Delete ALL ${count} link(s) and reset settings?\n\n` +
    `This cannot be undone.`
  );
  if (!ok) return;

  clearAllLinks();
  localStorage.removeItem(SETTINGS_KEY);

  links = [];
  settings = { ...DEFAULT_SETTINGS };

  applyTheme(settings.theme, false);
  $$('input[name="expiry"]').forEach(r => {
    r.checked = r.value === settings.defaultExpiry;
  });

  renderLinks();
  renderAnalytics();
  showToast('All data cleared.', 'success');
});

// =====================================================
// PHASE 5 helpers — clipboard, time, expiry, click tracking
// =====================================================

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back:', err);
    }
  }

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

function expiryBadge(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '<span class="badge badge--expired">expired</span>';
  const days = Math.ceil(diff / 86400000);
  return `<span class="badge badge--expiring" title="Expires ${new Date(expiresAt).toLocaleString()}">${days}d</span>`;
}

/**
 * Convert the settings expiry value into a timestamp or null.
 * @param {string} value 'never' | '7' | '30'
 * @returns {number|null}
 */
function expiryToTimestamp(value) {
  if (value === 'never' || !value) return null;
  const days = parseInt(value, 10);
  if (!Number.isFinite(days) || days <= 0) return null;
  return Date.now() + days * 86400000;
}

/** True if a link is expired (expiresAt set and in the past). */
function isExpired(link) {
  return typeof link.expiresAt === 'number' && link.expiresAt <= Date.now();
}

function incrementClicks(id) {
  const stored = loadLinks();
  const target = stored.find(l => l.id === id);
  if (!target) return;

  target.clicks = (target.clicks || 0) + 1;

  if (!Array.isArray(target.clicksLog)) target.clicksLog = [];
  target.clicksLog.push(Date.now());

  const MAX_LOG = 1000;
  if (target.clicksLog.length > MAX_LOG) {
    target.clicksLog = target.clicksLog.slice(-MAX_LOG);
  }

  saveLinks(stored);
  links = stored;
}

// =====================================================
// PHASE 2 — URL validation
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
// PHASE 3 — Short code generation
// =====================================================
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 5;
const SHORT_DOMAIN = 'short.ly';

function generateCode(length = CODE_LENGTH) {
  let code = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    code += BASE62[bytes[i] % BASE62.length];
  }
  return code;
}

function generateUniqueCode(existingLinks) {
  const taken = new Set(existingLinks.map(l => l.shortCode));
  for (let i = 0; i < 1000; i++) {
    const code = generateCode();
    if (!taken.has(code)) return code;
  }
  return generateCode(CODE_LENGTH + 2);
}

// =====================================================
// PHASE 4 — LocalStorage persistence
// =====================================================
const STORAGE_KEY = 'linkshortener.links.v1';

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

function saveLinks(linksToSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(linksToSave));
  } catch (err) {
    console.error('Failed to save links:', err);
    showToast('Storage is full or unavailable.', 'error');
  }
}

function getLinks() {
  return loadLinks();
}

function addLink(link) {
  const stored = loadLinks();
  stored.unshift(link);
  saveLinks(stored);
  return link;
}

function deleteLink(id) {
  const stored = loadLinks().filter(l => l.id !== id);
  saveLinks(stored);
}

function clearAllLinks() {
  localStorage.removeItem(STORAGE_KEY);
}

// In-memory mirror (kept in sync by renderers)
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

function handleValidUrl(validUrl) {
  // Duplicate check — same original URL returns existing link
  const existing = links.find(l => l.originalUrl === validUrl);
  if (existing) {
    showResult(existing);
    showToast('This URL is already shortened.', 'info');
    return;
  }

  // PHASE 9: apply default expiry from settings
  const expiresAt = expiryToTimestamp(settings.defaultExpiry);

  const code = generateUniqueCode(links);
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

  if ($('#page-links').classList.contains('is-active')) renderLinks();
}

function showResult(link) {
  const shortUrl = `${SHORT_DOMAIN}/${link.shortCode}`;
  els.resultLink.textContent = shortUrl;
  els.resultLink.href = link.originalUrl;
  els.resultLink.dataset.shortUrl = shortUrl;
  els.result.hidden = false;

  els.urlInput.value = '';
  els.urlInput.focus();
}

els.copyBtn.addEventListener('click', async () => {
  const shortUrl = els.resultLink.dataset.shortUrl || els.resultLink.textContent;
  const ok = await copyToClipboard(shortUrl);

  if (ok) {
    showToast('Copied to clipboard!', 'success', 1800);
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

els.resultLink.addEventListener('click', (e) => {
  e.preventDefault();
  const shortUrl = els.resultLink.dataset.shortUrl || els.resultLink.textContent;
  const link = links.find(l => `${SHORT_DOMAIN}/${l.shortCode}` === shortUrl);
  if (link) {
    incrementClicks(link.id);
    window.open(link.originalUrl, '_blank', 'noopener');
    showToast('Opening link…', 'info', 1500);
    if ($('#page-links').classList.contains('is-active')) renderLinks();
    if ($('#page-analytics').classList.contains('is-active')) renderAnalytics();
  } else {
    window.open(els.resultLink.href, '_blank', 'noopener');
  }
});

// =====================================================
// PHASE 6 / 7 — Render links table + search & filter
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

/** Current filter state (source of truth for renderLinks). */
const filterState = {
  query: '',
  range: 'all', // 'all' | 'today' | 'week' | 'month'
};

els.searchInput.addEventListener('input', (e) => {
  filterState.query = e.target.value;
  renderLinks();
});

els.filterSelect.addEventListener('change', (e) => {
  filterState.range = e.target.value;
  renderLinks();
});

function getRangeStart() {
  const now = new Date();
  const startOfTodayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  switch (filterState.range) {
    case 'today':
      return startOfTodayTs;
    case 'week': {
      const d = new Date(startOfTodayTs);
      d.setDate(d.getDate() - 6);
      return d.getTime();
    }
    case 'month': {
      const d = new Date(startOfTodayTs);
      d.setDate(d.getDate() - 29);
      return d.getTime();
    }
    default:
      return null;
  }
}

function applyFilters(all) {
  const q = filterState.query.trim().toLowerCase();
  const rangeStart = getRangeStart();

  return all.filter(link => {
    if (isExpired(link)) return false;
    if (rangeStart !== null && link.createdAt < rangeStart) return false;
    if (q) {
      const haystack = `${link.originalUrl} ${link.shortCode}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function renderLinks() {
  const all = getLinks();
  links = all;

  const filtered = applyFilters(all);
  const hasAny = all.length > 0;
  const hasMatches = filtered.length > 0;
  const isFiltering = filterState.query.trim() !== '' || filterState.range !== 'all';

  if (!hasAny) {
    els.emptyState.hidden = false;
    els.noResults.hidden = true;
    els.tableWrap.hidden = true;
    els.linksMeta.hidden = true;
    return;
  }

  if (!hasMatches) {
    els.emptyState.hidden = true;
    els.noResults.hidden = false;
    els.tableWrap.hidden = true;
    els.linksMeta.hidden = true;
    return;
  }

  els.emptyState.hidden = true;
  els.noResults.hidden = true;
  els.tableWrap.hidden = false;

  if (isFiltering) {
    els.linksMeta.hidden = false;
    els.linksMeta.textContent = `Showing ${filtered.length} of ${all.length} link${all.length === 1 ? '' : 's'}`;
  } else {
    els.linksMeta.hidden = true;
  }

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
          ${link.expiresAt ? expiryBadge(link.expiresAt) : ''}
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
// PHASE 5 — Delegated table actions (Copy / Open / Delete)
// =====================================================
let _handlingClick = false;

els.linksBody.addEventListener('click', async (e) => {
  if (_handlingClick) return;

  const actionBtn = e.target.closest('[data-action]');
  const shortLink = e.target.closest('.short-link');

  if (actionBtn) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

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
      setTimeout(() => { _handlingClick = false; }, 0);
    }
    return;
  }

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
// PHASE 8 — Analytics dashboard
// =====================================================

/** Current chart range in days ('7'|'30'|'90'|'all'). */
let chartRange = 7;

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getRangeDays(range, allLinks) {
  const today = startOfToday();

  let count;
  if (range === 'all') {
    const oldest = allLinks.reduce(
      (min, l) => Math.min(min, l.createdAt),
      Date.now()
    );
    const oldestDay = new Date(oldest);
    oldestDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - oldestDay) / 86400000) + 1;
    count = Math.max(diffDays, 7);
  } else {
    count = range;
  }

  const days = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d, key: dateKey(d) });
  }
  return days;
}

function bucketClicks(days, allLinks) {
  const index = new Map(days.map((d, i) => [d.key, i]));
  const counts = new Array(days.length).fill(0);

  for (const link of allLinks) {
    const log = Array.isArray(link.clicksLog) ? link.clicksLog : [];
    if (log.length > 0) {
      for (const ts of log) {
        const i = index.get(dateKey(new Date(ts)));
        if (i !== undefined) counts[i]++;
      }
    } else if (link.clicks > 0) {
      const i = index.get(dateKey(new Date(link.createdAt)));
      if (i !== undefined) counts[i] += link.clicks;
    }
  }
  return counts;
}

function sparklinePath(values, w = 80, h = 28) {
  if (values.length < 2) return '';
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);

  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 4) - 2;
    return [x, y];
  });

  return 'M ' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
}

function fmt(n) {
  return n.toLocaleString();
}

function computeDelta(current, previous) {
  if (previous === 0 && current === 0) return '—';
  if (previous === 0) return `+${current} new`;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% vs prev`;
}

function renderSparkline(container, values) {
  if (!container) return;
  if (values.length < 2 || values.every(v => v === 0)) {
    container.innerHTML = `<span class="spark-empty">—</span>`;
    return;
  }
  const w = 80, h = 28;
  const d = sparklinePath(values, w, h);
  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function renderAreaChart(values, days) {
  const svg = els.areaChart;
  const w = 700;
  const h = 320;
  const padTop = 14;
  const padBottom = 56;
  const padLeft = 26;
  const padRight = 8;
  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  if (!values || values.length === 0 || values.every(v => v === 0)) {
    svg.innerHTML = '';
    if (els.chartEmpty) els.chartEmpty.hidden = false;
    if (els.chartAxis) els.chartAxis.innerHTML = '';
    return;
  }
  if (els.chartEmpty) els.chartEmpty.hidden = true;

  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;

  const pts = values.map((v, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + innerH - (v / max) * innerH;
    return [x, y];
  });

  let line = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    line += ` C ${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }

  const baselineY = padTop + innerH;
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)},${baselineY} L ${pts[0][0].toFixed(1)},${baselineY} Z`;

  const yTicks = 4;
  let gridLines = '';
  for (let i = 0; i <= yTicks; i++) {
    const y = padTop + (i / yTicks) * innerH;
    const label = Math.round(max - (i / yTicks) * max);
    gridLines += `
      <line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${w - padRight}" y2="${y.toFixed(1)}"
            stroke="currentColor" stroke-opacity="0.10" stroke-width="1" />
      <text x="${padLeft - 6}" y="${(y + 3).toFixed(1)}"
            text-anchor="end" dominant-baseline="middle"
            fill="currentColor" fill-opacity="0.45"
            font-size="11" font-family="system-ui">${label}</text>
    `;
  }

  let dots = '';
  const showDots = values.length <= 45;
  if (showDots) {
    dots = values.map((v, i) => {
      if (v === 0) return '';
      const [x, y] = pts[i];
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"
                      fill="white" stroke="#7c3aed" stroke-width="2" />`;
    }).join('');
  }

  const maxLabels = 7;
  const labelStep = Math.max(1, Math.ceil(days.length / maxLabels));
  let xLabels = '';
  days.forEach((d, i) => {
    const isLast = i === days.length - 1;
    const isFirst = i === 0;
    if (!isFirst && !isLast && i % labelStep !== 0) return;

    const x = pts[i][0];
    const label = d.date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    let anchor = 'middle';
    if (isFirst) anchor = 'start';
    if (isLast) anchor = 'end';

    xLabels += `
      <text x="${x.toFixed(1)}" y="${(h - 28).toFixed(1)}"
            text-anchor="${anchor}" dominant-baseline="hanging"
            fill="currentColor" fill-opacity="0.65"
            font-size="12" font-family="system-ui"
            font-weight="500">${label}</text>
    `;
  });

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#8b5cf6" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    <g class="grid">${gridLines}</g>
    <path d="${area}" fill="url(#areaFill)" />
    <path d="${line}" fill="none" stroke="#7c3aed" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
    <g class="x-labels">${xLabels}</g>
  `;
}

function renderLeaderboard(allLinks) {
  const sorted = [...allLinks]
    .filter(l => (l.clicks || 0) > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  if (sorted.length === 0) {
    els.leaderboard.innerHTML = '';
    els.leaderboardEmpty.hidden = false;
    return;
  }
  els.leaderboardEmpty.hidden = true;

  const maxClicks = sorted[0].clicks;

  els.leaderboard.innerHTML = sorted.map((link, i) => {
    const pct = (link.clicks / maxClicks) * 100;
    return `
      <li class="leaderboard__item">
        <div class="leaderboard__head">
          <span class="leaderboard__rank">#${i + 1}</span>
          <span class="leaderboard__code">${link.shortCode}</span>
          <span class="leaderboard__clicks">${link.clicks}</span>
        </div>
        <div class="leaderboard__bar">
          <div class="leaderboard__bar-fill" style="width: ${pct}%"></div>
        </div>
        <p class="leaderboard__url" title="${link.originalUrl}">${truncateUrl(link.originalUrl, 32)}</p>
      </li>
    `;
  }).join('');
}

function renderAnalytics() {
  links = getLinks();

  const allLinks = links;
  const totalClicks = allLinks.reduce((s, l) => s + (l.clicks || 0), 0);
  const todayStart = startOfToday().getTime();
  const yesterdayStart = todayStart - 86400000;

  let clicksToday = 0;
  let clicksYesterday = 0;
  for (const link of allLinks) {
    const log = Array.isArray(link.clicksLog) ? link.clicksLog : [];
    for (const ts of log) {
      if (ts >= todayStart) clicksToday++;
      else if (ts >= yesterdayStart) clicksYesterday++;
    }
  }

  const linksToday = allLinks.filter(l => l.createdAt >= todayStart).length;

  const top = allLinks.reduce(
    (best, l) => ((l.clicks || 0) > (best?.clicks || -1) ? l : best),
    null
  );

  els.totalLinks.textContent = fmt(allLinks.length);
  els.linksDelta.textContent = linksToday > 0
    ? `+${linksToday} today`
    : (allLinks.length ? '—' : 'Getting started');

  els.totalClicks.textContent = fmt(totalClicks);
  els.clicksDelta.textContent = computeDelta(
    countClicksInWindow(allLinks, 7),
    countClicksInWindow(allLinks, 14) - countClicksInWindow(allLinks, 7)
  );

  els.clicksToday.textContent = fmt(clicksToday);
  els.todayDelta.textContent = computeDelta(clicksToday, clicksYesterday);

  if (top && top.clicks > 0) {
    els.topLink.textContent = top.shortCode;
    els.topLink.title = top.originalUrl;
    els.topLinkMeta.textContent = `${top.clicks} clicks`;
  } else {
    els.topLink.textContent = '—';
    els.topLink.removeAttribute('title');
    els.topLinkMeta.textContent = 'No clicks yet';
  }

  const sparkDays = getRangeDays(7, allLinks);
  const sparkCounts = bucketClicks(sparkDays, allLinks);
  renderSparkline(els.clicksSpark, sparkCounts);
  renderSparkline(els.todaySpark, sparkCounts.slice(-3));
  renderSparkline(els.linksSpark, getRecentLinksSpark(allLinks, 7));

  const range = chartRange;
  const days = getRangeDays(range, allLinks);
  const counts = bucketClicks(days, allLinks);
  const rangeTotal = counts.reduce((a, b) => a + b, 0);

  els.chartSummary.textContent =
    `${fmt(rangeTotal)} click${rangeTotal === 1 ? '' : 's'} ` +
    (range === 'all'
      ? `all-time`
      : `in the last ${range} day${range === 1 ? '' : 's'}`);

  renderAreaChart(counts, days);
  renderLeaderboard(allLinks);
}

function countClicksInWindow(allLinks, days) {
  const cutoff = Date.now() - days * 86400000;
  let n = 0;
  for (const link of allLinks) {
    const log = Array.isArray(link.clicksLog) ? link.clicksLog : [];
    for (const ts of log) if (ts >= cutoff) n++;
  }
  return n;
}

function getRecentLinksSpark(allLinks, days) {
  const dayList = getRangeDays(days, allLinks);
  const index = new Map(dayList.map((d, i) => [d.key, i]));
  const counts = new Array(dayList.length).fill(0);
  for (const link of allLinks) {
    const i = index.get(dateKey(new Date(link.createdAt)));
    if (i !== undefined) counts[i]++;
  }
  return counts;
}

// Range tab listeners (register once)
els.rangeTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  $$('.tab', els.rangeTabs).forEach(t => t.classList.toggle('is-active', t === btn));
  const r = btn.dataset.range;
  chartRange = r === 'all' ? 'all' : parseInt(r, 10);
  renderAnalytics();
});

// =====================================================
// Init
// =====================================================
switchPage('shorten');
renderLinks();
renderAnalytics();

console.log(
  `%c🔗 LinkShortener — Phases 1-9 ready (${links.length} links in storage)`,
  'color:#4f46e5;font-weight:bold;'
);