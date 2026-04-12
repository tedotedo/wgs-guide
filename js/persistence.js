/* WGS Record of Discussion — Persistence
 *
 * Autosave / load for form state. Keys are **namespaced** per form:
 * `rod-form-data:<id>`. Each id represents one person in a trio
 * (e.g. `proband`, `mother`, `father`) so a family can fill
 * independent forms without overwriting each other. Never use the
 * bare `rod-form-data` key for writes — that was the pre-trio
 * layout and is now only read once during migration. And never use
 * `wgs-rod-form`, which was the source of a real bug where
 * startNewForm cleared one key while saveFormData wrote to another.
 *
 * The current form's id comes from the `?id=...` query parameter
 * on `form.html`. If absent it defaults to `proband` so plain
 * `form.html` links keep working after the upgrade.
 *
 * Includes HCP-only fields (patient-cat, test-type, research-no
 * reasons, remote-consent) — these were silently dropped from
 * persistence and the PDF in an earlier version.
 *
 * Depends on `debounce` and `showToast` from form.js (resolved at
 * runtime, not parse time — form.js loads after this file).
 */

// Prefix every stored form. The full key is `FORM_KEY_PREFIX + id`.
// Keep this exported-shaped constant so chrome.js and dashboard.js
// can enumerate forms without duplicating the string.
const FORM_KEY_PREFIX = 'rod-form-data:';
const LEGACY_FORM_KEY = 'rod-form-data';
const DEFAULT_FORM_ID = 'proband';

// The id of the form currently being edited. Set by initFormId()
// from the URL query string before load/save runs.
let currentFormId = DEFAULT_FORM_ID;

// Only [a-z0-9_-] up to 40 chars. Anything else is stripped. This
// prevents stray `?id=../../etc` or malformed localStorage keys.
function sanitizeFormId(raw) {
  if (!raw) return DEFAULT_FORM_ID;
  const cleaned = String(raw).trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 40);
  return cleaned || DEFAULT_FORM_ID;
}

function getCurrentFormId() {
  return currentFormId;
}

function getFormStorageKey(id) {
  return FORM_KEY_PREFIX + sanitizeFormId(id == null ? currentFormId : id);
}

// Read the ?id= query param on form.html and set currentFormId.
// Safe to call from any page — returns the default if there's no
// query string or the id is missing.
function initFormId() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    currentFormId = sanitizeFormId(params.get('id'));
  } catch (e) {
    currentFormId = DEFAULT_FORM_ID;
  }
  return currentFormId;
}

// One-time migration: move any pre-trio value stored under the flat
// `rod-form-data` key into `rod-form-data:proband`. Idempotent —
// later calls are no-ops because legacy is deleted on success.
function migrateLegacyFormStorage() {
  try {
    const legacy = localStorage.getItem(LEGACY_FORM_KEY);
    if (!legacy) return;
    const probandKey = FORM_KEY_PREFIX + DEFAULT_FORM_ID;
    if (!localStorage.getItem(probandKey)) {
      localStorage.setItem(probandKey, legacy);
    }
    localStorage.removeItem(LEGACY_FORM_KEY);
  } catch (e) { /* storage unavailable */ }
}

// Small UI badge that tells the user which form they're editing
// when it isn't the default proband. Mounts into #form-id-badge if
// the element exists on the page (form.html does; other pages skip).
function renderFormIdBadge() {
  const host = document.getElementById('form-id-badge');
  if (!host) return;
  if (currentFormId === DEFAULT_FORM_ID) {
    host.style.display = 'none';
    return;
  }
  host.style.display = '';
  host.textContent = 'Editing: ' + currentFormId;
}

// Enumerate every `rod-form-data:*` key so the dashboard can list
// forms without each caller re-implementing key iteration. Returns
// an array of { id, data } where data is the parsed stored object
// (or null if parse failed).
function listStoredForms() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(FORM_KEY_PREFIX)) continue;
      const id = k.slice(FORM_KEY_PREFIX.length);
      let data = null;
      try { data = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { data = null; }
      out.push({ id, data });
    }
  } catch (e) { /* storage unavailable */ }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function initAutoSave() {
  const inputs = document.querySelectorAll('.form-input, .form-check input');
  inputs.forEach(input => {
    input.addEventListener('change', saveFormData);
    input.addEventListener('input', debounce(saveFormData, 500));
  });

  document.getElementById('save-draft')?.addEventListener('click', () => {
    saveFormData();
    showToast('Draft saved to your browser');
  });
}

function saveFormData() {
  const checkedValues = (selector) =>
    Array.from(document.querySelectorAll(selector)).filter(i => i.checked).map(i => i.value);

  const data = {
    firstName: document.getElementById('first-name')?.value || '',
    lastName: document.getElementById('last-name')?.value || '',
    nhsNumber: document.getElementById('nhs-number')?.value || '',
    dob: document.getElementById('dob')?.value || '',
    consentBasis: document.querySelector('input[name="consent-basis"]:checked')?.value || '',
    discussionChecks: [],
    choiceA: null,
    choiceB: null,
    guardianName: document.getElementById('guardian-name')?.value || '',
    guardianDate: document.getElementById('guardian-date')?.value || '',
    sigDate: document.getElementById('sig-date')?.value || '',
    hcpClinician: document.getElementById('hcp-clinician')?.value || '',
    hcpHospital: document.getElementById('hcp-hospital')?.value || '',
    hcpName: document.getElementById('hcp-name')?.value || '',
    hcpDate: document.getElementById('hcp-date')?.value || '',
    patientCategories: checkedValues('input[name="patient-cat"]'),
    testType: document.querySelector('input[name="test-type"]:checked')?.value || '',
    researchNoReasons: checkedValues('input[name="research-no"]'),
    remoteConsent: document.getElementById('remote-consent')?.checked || false,
    savedAt: new Date().toISOString()
  };

  document.querySelectorAll('.dp-check').forEach(c => {
    data.discussionChecks.push(c.checked);
  });

  // Choices
  const aYes = document.getElementById('choice-a-yes');
  const aNo = document.getElementById('choice-a-no');
  if (aYes?.classList.contains('selected')) data.choiceA = 'yes';
  else if (aNo?.classList.contains('selected-no')) data.choiceA = 'no';

  const bYes = document.getElementById('choice-b-yes');
  const bNo = document.getElementById('choice-b-no');
  if (bYes?.classList.contains('selected')) data.choiceB = 'yes';
  else if (bNo?.classList.contains('selected-no')) data.choiceB = 'no';

  try {
    localStorage.setItem(getFormStorageKey(), JSON.stringify(data));
  } catch (e) { /* storage full */ }
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem(getFormStorageKey());
    if (!saved) return;
    const data = JSON.parse(saved);

    if (data.firstName) document.getElementById('first-name').value = data.firstName;
    if (data.lastName) document.getElementById('last-name').value = data.lastName;
    if (data.nhsNumber) document.getElementById('nhs-number').value = data.nhsNumber;
    if (data.dob) document.getElementById('dob').value = data.dob;
    if (data.consentBasis) {
      const radio = document.getElementById(data.consentBasis === 'self' ? 'consent-self' : data.consentBasis === 'child' ? 'consent-child' : 'consent-bestinterest');
      if (radio) radio.checked = true;
    }
    if (data.guardianName) document.getElementById('guardian-name').value = data.guardianName;
    if (data.guardianDate) document.getElementById('guardian-date').value = data.guardianDate;
    if (data.sigDate) document.getElementById('sig-date').value = data.sigDate;
    if (data.hcpClinician) document.getElementById('hcp-clinician').value = data.hcpClinician;
    if (data.hcpHospital) document.getElementById('hcp-hospital').value = data.hcpHospital;
    if (data.hcpName) document.getElementById('hcp-name').value = data.hcpName;
    if (data.hcpDate) document.getElementById('hcp-date').value = data.hcpDate;
    if (Array.isArray(data.patientCategories)) {
      document.querySelectorAll('input[name="patient-cat"]').forEach(i => {
        i.checked = data.patientCategories.includes(i.value);
      });
    }
    if (data.testType) {
      const radio = document.querySelector(`input[name="test-type"][value="${data.testType}"]`);
      if (radio) radio.checked = true;
    }
    if (Array.isArray(data.researchNoReasons)) {
      document.querySelectorAll('input[name="research-no"]').forEach(i => {
        i.checked = data.researchNoReasons.includes(i.value);
      });
    }
    if (data.remoteConsent) {
      const el = document.getElementById('remote-consent');
      if (el) el.checked = true;
    }

    if (data.discussionChecks) {
      document.querySelectorAll('.dp-check').forEach((c, i) => {
        if (data.discussionChecks[i]) {
          c.checked = true;
          c.closest('.discussion-point')?.classList.add('understood');
        }
      });
    }

    if (data.choiceA === 'yes') document.getElementById('choice-a-yes')?.click();
    else if (data.choiceA === 'no') document.getElementById('choice-a-no')?.click();

    if (data.choiceB === 'yes') document.getElementById('choice-b-yes')?.click();
    else if (data.choiceB === 'no') document.getElementById('choice-b-no')?.click();
  } catch (e) { /* invalid data */ }
}
