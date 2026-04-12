/* WGS Record of Discussion — Trio Dashboard
 *
 * Lists every stored form keyed on `rod-form-data:<id>`, supports
 * create / open / duplicate / rename / delete, and links each row
 * back to `form.html?id=<id>`. All state lives in localStorage —
 * there is no server round trip.
 *
 * This page loads js/persistence.js so it can reuse
 * listStoredForms(), FORM_KEY_PREFIX, DEFAULT_FORM_ID, and
 * sanitizeFormId() directly rather than duplicating them.
 */

(function () {
  const listEl = () => document.getElementById('dashboard-list');
  const emptyEl = () => document.getElementById('dashboard-empty');

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return '—'; }
  }

  function describeConsent(basis) {
    switch (basis) {
      case 'self': return 'Self (patient)';
      case 'child': return 'Child (parent/guardian)';
      case 'best-interests': return 'Best interests';
      default: return '—';
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderRow(entry) {
    const id = entry.id;
    const d = entry.data || {};
    const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ') || '(no name entered)';
    const dob = d.dob || '';
    const consent = describeConsent(d.consentBasis);
    const saved = fmtDate(d.savedAt);
    const acknowledgedCount = Array.isArray(d.discussionChecks)
      ? d.discussionChecks.filter(Boolean).length
      : 0;

    return `
      <div class="dashboard-row" data-form-id="${escapeHtml(id)}">
        <div class="dashboard-row__main">
          <div class="dashboard-row__id">${escapeHtml(id)}</div>
          <div class="dashboard-row__name">${escapeHtml(fullName)}</div>
          <div class="dashboard-row__meta">
            <span>${escapeHtml(consent)}</span>
            ${dob ? `<span>· DOB ${escapeHtml(dob)}</span>` : ''}
            <span>· ${acknowledgedCount}/7 discussion points</span>
            <span>· Saved ${escapeHtml(saved)}</span>
          </div>
        </div>
        <div class="dashboard-row__actions">
          <a class="btn btn--primary btn--sm" href="form.html?id=${encodeURIComponent(id)}">Open</a>
          <button class="btn btn--secondary btn--sm" data-action="duplicate">Duplicate</button>
          <button class="btn btn--secondary btn--sm" data-action="rename">Rename</button>
          <button class="btn btn--secondary btn--sm" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  }

  function render() {
    const forms = typeof listStoredForms === 'function' ? listStoredForms() : [];
    const list = listEl();
    const empty = emptyEl();
    if (!list) return;

    if (forms.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    list.innerHTML = forms.map(renderRow).join('');
  }

  function promptForNewId(defaultValue) {
    const raw = window.prompt(
      'Form id (e.g. proband, mother, father, or a name). Only letters, numbers, hyphens and underscores are allowed.',
      defaultValue || ''
    );
    if (raw == null) return null;
    const clean = typeof sanitizeFormId === 'function' ? sanitizeFormId(raw) : raw;
    if (!clean) {
      alert('That id is not valid. Please use letters, numbers, hyphens or underscores only.');
      return null;
    }
    return clean;
  }

  function existingIds() {
    return new Set((typeof listStoredForms === 'function' ? listStoredForms() : []).map(f => f.id));
  }

  function createForm() {
    const existing = existingIds();
    // Suggest the first sensible label that isn't already taken.
    const suggestions = ['proband', 'mother', 'father', 'child', 'sibling'];
    const suggestion = suggestions.find(s => !existing.has(s)) || '';
    const id = promptForNewId(suggestion);
    if (!id) return;
    if (existing.has(id)) {
      if (!confirm(`A form with id "${id}" already exists. Open it instead?`)) return;
    }
    // Redirect to the form wizard with this id pre-selected. The
    // wizard's own initFormId / loadSavedData handle creation vs
    // opening transparently — an id with no stored data just starts
    // as a blank form and is written on first save.
    window.location.href = 'form.html?id=' + encodeURIComponent(id);
  }

  function duplicateForm(sourceId) {
    const key = FORM_KEY_PREFIX + sourceId;
    const raw = localStorage.getItem(key);
    if (!raw) { alert('Could not read the source form.'); return; }

    const existing = existingIds();
    const newId = promptForNewId(sourceId + '-copy');
    if (!newId) return;
    if (existing.has(newId)) {
      if (!confirm(`"${newId}" already exists. Overwrite it?`)) return;
    }
    try {
      localStorage.setItem(FORM_KEY_PREFIX + newId, raw);
      render();
    } catch (e) {
      alert('Could not save the duplicated form: ' + e.message);
    }
  }

  function renameForm(sourceId) {
    const key = FORM_KEY_PREFIX + sourceId;
    const raw = localStorage.getItem(key);
    if (!raw) { alert('Could not read the source form.'); return; }

    const existing = existingIds();
    existing.delete(sourceId);
    const newId = promptForNewId(sourceId);
    if (!newId || newId === sourceId) return;
    if (existing.has(newId)) {
      if (!confirm(`"${newId}" already exists. Overwrite it?`)) return;
    }
    try {
      localStorage.setItem(FORM_KEY_PREFIX + newId, raw);
      localStorage.removeItem(key);
      render();
    } catch (e) {
      alert('Could not rename the form: ' + e.message);
    }
  }

  function deleteForm(sourceId) {
    if (!confirm(`Delete the "${sourceId}" form? This cannot be undone.`)) return;
    try {
      localStorage.removeItem(FORM_KEY_PREFIX + sourceId);
      render();
    } catch (e) {
      alert('Could not delete the form: ' + e.message);
    }
  }

  function onListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const row = btn.closest('.dashboard-row');
    if (!row) return;
    const id = row.dataset.formId;
    if (!id) return;
    switch (btn.dataset.action) {
      case 'duplicate': duplicateForm(id); break;
      case 'rename':    renameForm(id); break;
      case 'delete':    deleteForm(id); break;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Migrate any pre-trio flat key before we enumerate, so the
    // dashboard shows the proband immediately on first load.
    if (typeof migrateLegacyFormStorage === 'function') migrateLegacyFormStorage();

    render();

    document.getElementById('create-form-btn')?.addEventListener('click', createForm);
    document.getElementById('create-form-btn-empty')?.addEventListener('click', createForm);
    listEl()?.addEventListener('click', onListClick);
  });
})();
