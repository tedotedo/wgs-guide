/* WGS Record of Discussion — Persistence
 *
 * Autosave / load for form state. Key is ALWAYS `rod-form-data`.
 * Never use `wgs-rod-form` — that name was the source of a real bug
 * where startNewForm cleared one key while saveFormData wrote to
 * another, leaking previous-patient data into new forms.
 *
 * Includes HCP-only fields (patient-cat, test-type, research-no
 * reasons, remote-consent) — these were silently dropped from
 * persistence and the PDF in an earlier version.
 *
 * Depends on `debounce` and `showToast` from form.js (resolved at
 * runtime, not parse time — form.js loads after this file).
 */

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
    localStorage.setItem('rod-form-data', JSON.stringify(data));
  } catch (e) { /* storage full */ }
}

function loadSavedData() {
  try {
    const saved = localStorage.getItem('rod-form-data');
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
