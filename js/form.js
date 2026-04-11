/* WGS Record of Discussion — Form Logic */

document.addEventListener('DOMContentLoaded', () => {
  initFormSteps();
  initDiscussionPoints();
  initChoiceCards();
  initSignaturePads();
  initAutoSave();
  loadSavedData();
  initPdfDownload();
});

/* ============ STEP NAVIGATION ============ */
function initFormSteps() {
  const steps = document.querySelectorAll('.form-step');
  const indicators = document.querySelectorAll('.step');
  const connectors = document.querySelectorAll('.step__connector');
  const progressFill = document.getElementById('progress-fill');

  function goToStep(n) {
    steps.forEach(s => s.classList.remove('active'));
    indicators.forEach(s => s.classList.remove('active', 'completed'));

    document.getElementById(`step-${n}`).classList.add('active');

    indicators.forEach((ind, i) => {
      const stepNum = i + 1;
      if (stepNum < n) ind.classList.add('completed');
      else if (stepNum === n) ind.classList.add('active');
    });

    connectors.forEach((c, i) => {
      c.classList.toggle('completed', i < n - 1);
    });

    // 0% on step 1 (nothing done yet), 50% on step 2, 100% on step 3
    progressFill.style.width = `${((n - 1) / 2) * 100}%`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-fill patient name on step 3
    if (n === 3) {
      const fn = document.getElementById('first-name').value;
      const ln = document.getElementById('last-name').value;
      document.getElementById('sig-patient-name').value = `${fn} ${ln}`.trim();
      const today = new Date().toISOString().split('T')[0];
      if (!document.getElementById('sig-date').value) {
        document.getElementById('sig-date').value = today;
      }
    }
  }

  // Next buttons
  document.getElementById('next-to-2')?.addEventListener('click', () => {
    if (validateStep1()) goToStep(2);
  });
  document.getElementById('next-to-3')?.addEventListener('click', () => goToStep(3));

  // Back buttons
  document.getElementById('back-to-1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('back-to-2')?.addEventListener('click', () => goToStep(2));
}

function validateStep1() {
  const firstName = document.getElementById('first-name');
  const lastName = document.getElementById('last-name');
  const dob = document.getElementById('dob');
  const checks = document.querySelectorAll('.dp-check');
  const alertEl = document.getElementById('step1-incomplete');
  const consentBasis = document.querySelector('input[name="consent-basis"]:checked');
  let valid = true;
  let firstInvalid = null;

  // Validate consent basis
  if (!consentBasis) {
    valid = false;
    firstInvalid = firstInvalid || document.querySelector('input[name="consent-basis"]')?.closest('.form-section');
  }

  [firstName, lastName, dob].forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      valid = false;
      firstInvalid = firstInvalid || field;
    } else {
      field.classList.remove('error');
    }
  });

  let firstUnchecked = null;
  checks.forEach(c => {
    if (!c.checked) {
      if (!firstUnchecked) firstUnchecked = c.closest('.discussion-point') || c;
    }
  });
  if (firstUnchecked) {
    valid = false;
    firstInvalid = firstInvalid || firstUnchecked;
  }

  if (alertEl) {
    alertEl.style.display = valid ? 'none' : 'flex';
    if (!valid && !consentBasis) {
      alertEl.querySelector('.alert__text').innerHTML = 'Please select who this form is for, complete all required fields, and confirm you understand all 7 discussion points before proceeding.';
    } else if (!valid) {
      alertEl.querySelector('.alert__text').innerHTML = 'Please complete all required fields and confirm you understand all 7 discussion points before proceeding.';
    }
  }

  // Scroll the first problem into view so mobile users know what to fix.
  if (!valid && firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof firstInvalid.focus === 'function') {
      try { firstInvalid.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    }
  }

  return valid;
}

/* ============ DISCUSSION POINTS ============ */
function initDiscussionPoints() {
  // Expand/collapse explanations
  document.querySelectorAll('.discussion-point__expand').forEach(btn => {
    // Sync initial ARIA state with the DOM
    const targetId = btn.dataset.target;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', targetId);
    btn.addEventListener('click', () => {
      const target = document.getElementById(targetId);
      if (target) {
        const nowOpen = !target.classList.contains('open');
        target.classList.toggle('open', nowOpen);
        btn.setAttribute('aria-expanded', String(nowOpen));
        btn.textContent = nowOpen
          ? '💡 Explain this to me ▲'
          : '💡 Explain this to me ▼';
      }
    });
  });

  // Understanding checkboxes
  document.querySelectorAll('.dp-check').forEach(check => {
    check.addEventListener('change', () => {
      const point = check.closest('.discussion-point');
      if (point) point.classList.toggle('understood', check.checked);
    });
  });
}

/* ============ CHOICE CARDS ============ */
function initChoiceCards() {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      const value = btn.dataset.value;
      const card = btn.closest('.choice-card');

      // Deselect siblings
      card.querySelectorAll('.choice-btn').forEach(b => {
        b.classList.remove('selected', 'selected-no');
      });

      btn.classList.add(value === 'yes' ? 'selected' : 'selected-no');
      card.className = 'choice-card mt-6';
      card.classList.add(value === 'yes' ? 'selected-yes' : 'selected-no');

      // If choice A is NO, hide choice B and show reason fields
      if (choice === 'a') {
        const bWrapper = document.getElementById('choice-b-wrapper');
        const reasonFields = document.getElementById('research-no-reason');
        if (value === 'no') {
          if (bWrapper) bWrapper.style.opacity = '0.4';
          if (reasonFields) reasonFields.style.display = 'block';
        } else {
          if (bWrapper) bWrapper.style.opacity = '1';
          if (reasonFields) reasonFields.style.display = 'none';
        }
      }

      saveFormData();
    });
  });
}

/* ============ SIGNATURE PADS ============ */
function initSignaturePads() {
  setupSignaturePad('patient-sig-canvas', 'patient-sig-clear', 'patient-sig-pad');
  setupSignaturePad('guardian-sig-canvas', 'guardian-sig-clear', 'guardian-sig-pad');
  setupSignaturePad('hcp-sig-canvas', 'hcp-sig-clear', 'hcp-sig-pad');
}

function setupSignaturePad(canvasId, clearBtnId, padId) {
  const canvas = document.getElementById(canvasId);
  const clearBtn = document.getElementById(clearBtnId);
  const pad = document.getElementById(padId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let drawing = false;
  let lastX = 0, lastY = 0;

  function applyStrokeStyle() {
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1A1F2E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const newWidth = Math.max(0, Math.floor(rect.width - 16));
    const newHeight = 150;
    // Only resize when dimensions actually change — otherwise keyboard/orientation
    // events on mobile would repeatedly wipe the signature.
    if (canvas.width === newWidth && canvas.height === newHeight) {
      applyStrokeStyle();
      return;
    }
    // Preserve any existing drawing across the resize
    let snapshot = null;
    if (canvas.width > 0 && canvas.height > 0) {
      try { snapshot = canvas.toDataURL(); } catch (e) { snapshot = null; }
    }
    canvas.width = newWidth;
    canvas.height = newHeight;
    applyStrokeStyle();
    if (snapshot) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = snapshot;
    }
  }

  resize();
  // Debounce resize so we don't redraw on every pixel of a mobile keyboard animation.
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function startDraw(e) {
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    pad?.classList.add('has-signature');
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  }

  function stopDraw() { drawing = false; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  clearBtn?.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pad?.classList.remove('has-signature');
  });
}

/* ============ AUTO-SAVE ============ */
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

/* ============ PDF DOWNLOAD & EMAIL ============ */
function initPdfDownload() {
  document.getElementById('download-pdf')?.addEventListener('click', () => {
    generatePdf();
    // Show the "Start New Form" prompt after downloading
    const prompt = document.getElementById('new-form-prompt');
    if (prompt) prompt.style.display = 'flex';
  });
  document.getElementById('email-pdf')?.addEventListener('click', emailPdf);
  document.getElementById('start-new-form')?.addEventListener('click', startNewForm);
}

function startNewForm() {
  if (!confirm('This will clear all current form data so you can start a new form (e.g. for a trio test). Make sure you have downloaded your PDF first.\n\nClear the form and start again?')) return;

  // Clear localStorage — must match the key used by saveFormData()
  localStorage.removeItem('rod-form-data');

  // Reset all form fields
  document.querySelectorAll('input[type="text"], input[type="date"]').forEach(f => f.value = '');
  document.querySelectorAll('.dp-check').forEach(c => c.checked = false);
  document.querySelectorAll('input[name="consent-basis"]').forEach(r => r.checked = false);
  // HCP section checkboxes/radios that previously leaked between forms
  document.querySelectorAll('input[name="patient-cat"], input[name="test-type"], input[name="research-no"], #remote-consent').forEach(el => el.checked = false);
  document.querySelectorAll('.discussion-point').forEach(dp => dp.classList.remove('understood'));
  document.querySelectorAll('.choice-btn').forEach(b => {
    b.classList.remove('selected', 'selected-no');
  });
  document.querySelectorAll('.choice-card').forEach(c => {
    c.className = 'choice-card mt-6';
  });
  // Hide research-no reason panel if it was open
  const reasonFields = document.getElementById('research-no-reason');
  if (reasonFields) reasonFields.style.display = 'none';

  // Reset signature canvases
  document.querySelectorAll('.signature-pad canvas').forEach(canvas => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.closest('.signature-pad')?.classList.remove('has-signature');
  });

  // Hide new-form prompt
  document.getElementById('new-form-prompt').style.display = 'none';

  // Go back to step 1
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-1').classList.add('active');
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'completed'));
  document.querySelector('.step[data-step="1"]').classList.add('active');
  document.querySelectorAll('.step__connector').forEach(c => c.classList.remove('completed'));
  document.getElementById('progress-fill').style.width = '0%';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('Form cleared — ready for a new entry');
}

function getConsentBasis() {
  const sel = document.querySelector('input[name="consent-basis"]:checked');
  if (!sel) return { value: 'self', label: 'The patient (making choices for themselves)' };
  const labels = {
    'self': 'The patient (making choices for themselves)',
    'child': 'A parent / guardian (making choices on behalf of their child)',
    'best-interests': 'A consultee (advising on behalf of an adult who lacks capacity, in their best interests, and confirming legal authority to do so)'
  };
  return { value: sel.value, label: labels[sel.value] || sel.value };
}

function getFormDataForPdf() {
  const firstName = document.getElementById('first-name')?.value || '';
  const lastName = document.getElementById('last-name')?.value || '';
  const nhsNumber = document.getElementById('nhs-number')?.value || '';
  const dob = document.getElementById('dob')?.value || '';
  const date = document.getElementById('sig-date')?.value || '';
  const guardianName = document.getElementById('guardian-name')?.value || '';
  const guardianDate = document.getElementById('guardian-date')?.value || '';
  const consentBasis = getConsentBasis();

  const checks = [];
  document.querySelectorAll('.dp-check').forEach(c => checks.push(c.checked));

  const aYes = document.getElementById('choice-a-yes')?.classList.contains('selected');
  const aNo = document.getElementById('choice-a-no')?.classList.contains('selected-no');
  const bYes = document.getElementById('choice-b-yes')?.classList.contains('selected');
  const bNo = document.getElementById('choice-b-no')?.classList.contains('selected-no');

  // HCP section (previously captured visually but dropped from the PDF)
  const hcpClinician = document.getElementById('hcp-clinician')?.value || '';
  const hcpHospital = document.getElementById('hcp-hospital')?.value || '';
  const hcpName = document.getElementById('hcp-name')?.value || '';
  const hcpDate = document.getElementById('hcp-date')?.value || '';
  const remoteConsent = document.getElementById('remote-consent')?.checked || false;
  const patientCategories = Array.from(document.querySelectorAll('input[name="patient-cat"]:checked')).map(i => i.value);
  const testType = document.querySelector('input[name="test-type"]:checked')?.value || '';
  const researchNoReasons = Array.from(document.querySelectorAll('input[name="research-no"]:checked')).map(i => i.value);

  // Embed signature images if the user has signed
  const signatureDataUrl = (id) => {
    const c = document.getElementById(id);
    if (!c) return null;
    const pad = c.closest('.signature-pad');
    if (!pad || !pad.classList.contains('has-signature')) return null;
    try { return c.toDataURL('image/png'); } catch (e) { return null; }
  };
  const patientSignature = signatureDataUrl('patient-sig-canvas');
  const guardianSignature = signatureDataUrl('guardian-sig-canvas');
  const hcpSignature = signatureDataUrl('hcp-sig-canvas');

  return {
    firstName, lastName, nhsNumber, dob, date, guardianName, guardianDate, consentBasis,
    checks, aYes, aNo, bYes, bNo,
    hcpClinician, hcpHospital, hcpName, hcpDate, remoteConsent,
    patientCategories, testType, researchNoReasons,
    patientSignature, guardianSignature, hcpSignature
  };
}

function buildPdfHtml(data) {
  const {
    firstName, lastName, nhsNumber, dob, date, guardianName, guardianDate, consentBasis,
    checks, aYes, aNo, bYes, bNo,
    hcpClinician, hcpHospital, hcpName, hcpDate, remoteConsent,
    patientCategories, testType, researchNoReasons,
    patientSignature, guardianSignature, hcpSignature
  } = data;

  const patientCategoryLabels = {
    'adult': 'Adult (made their own choices)',
    'adult-lacking': 'Adult lacking capacity (choices advised by consultee)',
    'child': 'Child (parent or guardian choices)',
    'clinician-agreed': 'Clinician has agreed to the test (in the patient\u2019s best interests)',
    'deceased': 'Deceased (choices made on behalf of deceased individual)'
  };
  const testTypeLabels = {
    'rare-disease': 'Rare and Inherited Diseases — WGS',
    'cancer': 'Cancer (paired tumour/normal) — WGS'
  };
  const researchNoLabels = {
    'discuss-later': 'Patient would like to discuss at a later date',
    'inappropriate': 'Inappropriate to have discussion',
    'lacks-capacity': 'Patient lacks capacity and no consultee available',
    'other': 'Other'
  };

  const sigImg = (src, alt) => src
    ? `<img src="${src}" alt="${alt}" style="max-width:100%;max-height:70px;display:block;margin:4px 0">`
    : `<div class="sig-area">${alt} — to be completed on printed form</div>`;
  const allAcknowledged = checks.every(c => c);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const discussionPoints = [
    { num: 1, title: 'Family and wider implications', statement: 'The results of my test may have implications for me and members of my family. My results may also be used to help the healthcare of members of my family and others nationally and internationally.' },
    { num: 2, title: 'Uncertainty', statement: 'The results of my test may have findings that are uncertain and not yet fully understood. This could change what my results mean for me and my treatment over time.' },
    { num: 3, title: 'Unexpected information', statement: 'The results of my test may reveal unexpected results not related to why I am having this test, including the possibility of discovering unexpected family relationships (non-paternity). I may need further tests or investigations.' },
    { num: 4, title: 'DNA storage', statement: 'Normal NHS laboratory practice is to store the DNA extracted from my sample even after my current testing is complete.' },
    { num: 5, title: 'Data storage', statement: 'The data from my genomic test will be securely stored so that it can be looked at again in the future if necessary.' },
    { num: 6, title: 'Health records', statement: 'Results from my genomic test will be part of my patient record, held in a national system only available to healthcare professionals.' },
    { num: 7, title: 'Research', statement: 'I have the opportunity to take part in research which may benefit myself or others, now or in the future.' }
  ];

  const pointsHtml = discussionPoints.map((p, i) => {
    const checked = checks[i];
    return `<div class="point">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span class="point-num">${p.num}. ${p.title}</span>
        <span class="${checked ? 'check' : 'cross'}">${checked ? '✓ ACKNOWLEDGED' : '✗ NOT ACKNOWLEDGED'}</span>
      </div>
      <div style="font-size:10pt;color:#333">${p.statement}</div>
    </div>`;
  }).join('\n');

  // Consent basis description for PDF
  let consentDesc = '';
  if (consentBasis.value === 'self') {
    consentDesc = `<strong>${firstName} ${lastName}</strong> confirms that they are the patient and are making these choices <strong>for themselves</strong>.`;
  } else if (consentBasis.value === 'child') {
    consentDesc = `<strong>${guardianName || '[Parent/Guardian name]'}</strong> confirms that they are making these choices <strong>on behalf of their child</strong>, <strong>${firstName} ${lastName}</strong> (the patient).`;
  } else {
    consentDesc = `<strong>${guardianName || '[Consultee name]'}</strong> confirms that they are advising <strong>in the best interests</strong> of <strong>${firstName} ${lastName}</strong> (the patient), who lacks capacity to make their own decision. <strong>They confirm that they have the legal authority to act in this capacity.</strong>`;
  }

  const hcpCategoriesHtml = patientCategories.length
    ? patientCategories.map(v => `<li>${patientCategoryLabels[v] || v}</li>`).join('')
    : '<li><em>Not selected</em></li>';
  const testTypeHtml = testType ? (testTypeLabels[testType] || testType) : '<em>Not selected</em>';
  const researchNoHtml = researchNoReasons.length
    ? `<strong>Reason(s) for declining research:</strong><ul>${researchNoReasons.map(v => `<li>${researchNoLabels[v] || v}</li>`).join('')}</ul>`
    : '';

  return `<!DOCTYPE html><html><head><title>Record of Discussion - ${firstName} ${lastName}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000;padding:30px 40px;max-width:800px;margin:0 auto;line-height:1.5}
  h1{font-size:16pt;color:#005EB8;margin-bottom:4px;margin-top:0}
  h2{font-size:13pt;color:#005EB8;margin-top:20px;border-bottom:2px solid #005EB8;padding-bottom:3px}
  .header-table{width:100%;border-collapse:collapse;margin-bottom:12px}
  .header-table td{border:1px solid #333;padding:5px 8px;font-size:10pt;width:50%}
  .header-table strong{color:#005EB8}
  .point{margin:6px 0;padding:8px 10px;border-left:3px solid #005EB8;background:#f5f6f9;font-size:10.5pt}
  .point-num{font-weight:bold;color:#005EB8;font-size:11pt}
  .check{color:#0a7d2c;font-weight:bold;font-size:10pt;background:#e6f5eb;padding:2px 8px;border-radius:3px}
  .cross{color:#d32f2f;font-weight:bold;font-size:10pt;background:#fde8e8;padding:2px 8px;border-radius:3px}
  .choice-box{border:2px solid #005EB8;padding:10px;margin:6px 0;border-radius:4px;font-size:12pt}
  .choice-yes{background:#e6f5eb;border-color:#0a7d2c}.choice-no{background:#fde8e8;border-color:#d32f2f}
  .ack-box{border:2px solid #333;padding:16px;margin:12px 0;background:#fffde7;border-radius:4px}
  .ack-box p{margin:4px 0;font-size:10.5pt}
  .consent-basis{border:2px solid #005EB8;padding:12px;margin:10px 0;background:#eef4fb;border-radius:4px}
  .sig-table{width:100%;border-collapse:collapse;margin:6px 0}
  .sig-table td{border:1px solid #999;padding:6px 8px;font-size:10pt;vertical-align:top}
  .sig-area{border:1px dashed #999;height:50px;margin:4px 0;display:flex;align-items:center;justify-content:center;color:#999;font-style:italic;font-size:9pt}
  .footer{margin-top:20px;font-size:7.5pt;color:#666;text-align:center;border-top:1px solid #ccc;padding-top:6px}
  .privacy{font-size:8pt;color:#888;margin-top:8px;font-style:italic;text-align:center}
  @media print{body{padding:15px 20px}.footer{page-break-inside:avoid}}
</style></head><body>

<h1>Record of Discussion Regarding Genomic Testing</h1>
<p style="font-size:10pt;color:#666;margin-top:0"><em>NHS Genomic Medicine Service | Form version 4.03 (01-NGIS-ROD)</em></p>

<table class="header-table">
  <tr><td><strong>Patient first name:</strong> ${firstName}</td><td><strong>Patient last name:</strong> ${lastName}</td></tr>
  <tr><td><strong>NHS number:</strong> ${nhsNumber || 'Not provided'}</td><td><strong>Date of birth:</strong> ${dob || 'Not provided'}</td></tr>
</table>

<!-- Consent Basis -->
<div class="consent-basis">
  <strong style="color:#005EB8">Basis of Consent:</strong><br>
  ${consentDesc}
</div>

<h2>Discussion Points — Understanding &amp; Acknowledgment</h2>
<p style="font-size:10pt"><strong>I have discussed genomic testing with my health professional and confirm that I have read and understood each of the following points:</strong></p>

${pointsHtml}

<h2>Research Choices</h2>
<div class="choice-box ${aYes ? 'choice-yes' : (aNo ? 'choice-no' : '')}">
  <strong>A. I have discussed taking part in the National Genomic Research Library:</strong> <strong>${aYes ? 'YES' : (aNo ? 'NO' : 'Not selected')}</strong>
</div>
<div class="choice-box ${bYes ? 'choice-yes' : (bNo ? 'choice-no' : '')}">
  <strong>B. I agree that my data and remainder sample may contribute to the Research Library:</strong> <strong>${bYes ? 'YES' : (bNo ? 'NO' : 'Not selected')}</strong>
</div>

<!-- Acknowledgment Declaration -->
<div class="ack-box">
  <p style="font-weight:bold;font-size:11pt;margin-bottom:8px">Declaration of Understanding</p>
  <p ${allAcknowledged ? '' : 'style="color:#d32f2f"'}>${allAcknowledged
    ? '✓ <strong>I confirm that I have read and understood all 7 discussion points above.</strong>'
    : '⚠ <strong>WARNING: Not all discussion points have been acknowledged.</strong>'}</p>
  <p>✓ I confirm that I have had the opportunity to ask questions about genomic testing and the information has been explained to me.</p>
  <p>✓ I understand that my research choice (above) is voluntary and does not affect my clinical care.</p>
  <p>✓ I agree to proceed with the genomic test, and my choices are recorded above.</p>
  ${consentBasis.value !== 'self' ? `<p>✓ I confirm that I am authorised to make these choices as: <strong>${consentBasis.label}</strong>.</p>` : ''}
</div>

<h2>Signatures</h2>
${consentBasis.value === 'self' ? `
<table class="sig-table">
  <tr><td style="width:60%"><strong>Patient name:</strong> ${firstName} ${lastName}</td><td><strong>Date:</strong> ${date || dateStr}</td></tr>
</table>
${sigImg(patientSignature, 'Patient signature')}
` : `
<table class="sig-table">
  <tr><td style="width:60%"><strong>Patient name:</strong> ${firstName} ${lastName}</td><td><strong>Date of birth:</strong> ${dob}</td></tr>
</table>
<table class="sig-table" style="margin-top:8px">
  <tr><td style="width:60%"><strong>${consentBasis.value === 'child' ? 'Parent / Guardian' : 'Consultee'} name:</strong> ${guardianName || '[To be completed]'}</td><td><strong>Date:</strong> ${guardianDate || date || dateStr}</td></tr>
</table>
${sigImg(guardianSignature, (consentBasis.value === 'child' ? 'Parent / Guardian' : 'Consultee') + ' signature')}
`}

<h2>Healthcare Professional Use Only</h2>
${remoteConsent ? '<p style="margin:4px 0"><strong>Remote consent:</strong> Recorded remotely by clinician (no patient signature).</p>' : ''}
<table class="sig-table">
  <tr>
    <td style="width:50%"><strong>Responsible clinician:</strong> ${hcpClinician || '________________'}</td>
    <td><strong>Hospital number:</strong> ${hcpHospital || '________________'}</td>
  </tr>
  <tr>
    <td><strong>HCP name:</strong> ${hcpName || '________________'}</td>
    <td><strong>Date:</strong> ${hcpDate || '________________'}</td>
  </tr>
</table>
<p style="margin:6px 0 2px"><strong>Patient category:</strong></p>
<ul style="margin-top:0">${hcpCategoriesHtml}</ul>
<p style="margin:6px 0 2px"><strong>Test type:</strong> ${testTypeHtml}</p>
${researchNoHtml}
${sigImg(hcpSignature, 'Healthcare professional signature')}

<div class="footer">
  <p><strong>This document is a record of the patient's understanding and choices regarding genomic testing.</strong></p>
  <p>Please print, sign, and email or hand to your consultant. The official NHS Record of Discussion form (01-NGIS-ROD v4.03) should be submitted to your Genomic Laboratory Hub.</p>
  <p>Generated: ${dateStr} at ${timeStr}</p>
</div>

<div class="privacy">No data from this form was collected or transmitted by the WGS Guide website. All information was processed locally in the user's browser only.</div>

</body></html>`;
}

/* ============ REAL PDF (jsPDF) ============ */
// The previous implementation opened window.print() on an HTML template.
// That works but (a) relies on popup permissions, (b) produces no
// downloaded file on many mobile browsers, and (c) cannot embed the
// canvas signatures. We now lazy-load jsPDF from a CDN on first use and
// fall back to the old print path if the CDN is unreachable (e.g. offline
// in a hospital clinic).
const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let _jsPdfPromise = null;
function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf);
  if (_jsPdfPromise) return _jsPdfPromise;
  _jsPdfPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSPDF_CDN;
    script.async = true;
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf);
      else reject(new Error('jsPDF loaded but global not found'));
    };
    script.onerror = () => {
      _jsPdfPromise = null; // allow retry
      reject(new Error('Failed to load jsPDF from CDN'));
    };
    document.head.appendChild(script);
  });
  return _jsPdfPromise;
}

function fmtPdfDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function safeFilename(s) {
  return (s || 'Patient').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'Patient';
}

// Main PDF renderer. Takes a jsPDF doc and the form-data object and draws
// the entire Record of Discussion summary across as many pages as needed.
function renderPdfDocument(doc, data) {
  const {
    firstName, lastName, nhsNumber, dob, date, guardianName, guardianDate, consentBasis,
    checks, aYes, aNo, bYes, bNo,
    hcpClinician, hcpHospital, hcpName, hcpDate, remoteConsent,
    patientCategories, testType, researchNoReasons,
    patientSignature, guardianSignature, hcpSignature
  } = data;

  const M = 15;                 // page margin (mm)
  const pageW = 210;            // A4 width
  const pageH = 297;            // A4 height
  const contentW = pageW - 2 * M;
  const BLUE = [0, 94, 184];
  const GREEN = [10, 125, 44];
  const RED = [211, 47, 47];
  const GRAY = [102, 102, 102];
  const BLACK = [20, 20, 20];

  let y = M;

  function setColor(rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setDraw(rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
  function setFill(rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }

  function ensureSpace(mm) {
    if (y + mm > pageH - M) {
      doc.addPage();
      y = M;
    }
  }

  // Wrapped paragraph at current font settings. Returns the y advance.
  function drawWrapped(text, opts = {}) {
    const { size = 10, style = 'normal', color = BLACK, x = M, maxWidth = contentW, lineHeight = 4.6, gap = 1 } = opts;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    setColor(color);
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    const blockH = lines.length * lineHeight;
    ensureSpace(blockH + gap);
    doc.text(lines, x, y);
    y += blockH + gap;
  }

  function drawLabelValue(label, value, opts = {}) {
    const { size = 9.5, x = M, colWidth = contentW } = opts;
    ensureSpace(5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    setColor(BLUE);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label + ' ');
    doc.setFont('helvetica', 'normal');
    setColor(BLACK);
    const vLines = doc.splitTextToSize(String(value || '—'), colWidth - labelW);
    doc.text(vLines, x + labelW, y);
    y += Math.max(5, vLines.length * 4.6);
  }

  function drawSectionHeading(title) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(BLUE);
    doc.text(title, M, y);
    setDraw(BLUE);
    doc.setLineWidth(0.5);
    doc.line(M, y + 1.5, pageW - M, y + 1.5);
    y += 7;
  }

  function drawBox(heightEstimate, fillRgb, borderRgb) {
    ensureSpace(heightEstimate);
    const startY = y;
    setFill(fillRgb);
    setDraw(borderRgb);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, startY, contentW, heightEstimate, 1.5, 1.5, 'FD');
    return startY;
  }

  // ---------- Header ----------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(BLUE);
  doc.text('Record of Discussion Regarding Genomic Testing', M, y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  setColor(GRAY);
  doc.text('NHS Genomic Medicine Service  |  Form version 4.03 (01-NGIS-ROD)', M, y);
  y += 6;
  setDraw(BLUE);
  doc.setLineWidth(0.8);
  doc.line(M, y, pageW - M, y);
  y += 5;

  // ---------- Patient details ----------
  drawLabelValue('Patient name:', `${firstName} ${lastName}`.trim() || '—');
  drawLabelValue('NHS number:', nhsNumber || 'Not provided');
  drawLabelValue('Date of birth:', fmtPdfDate(dob));
  y += 2;

  // ---------- Consent basis ----------
  let consentDesc;
  if (consentBasis.value === 'self') {
    consentDesc = `${firstName} ${lastName} confirms that they are the patient and are making these choices for themselves.`;
  } else if (consentBasis.value === 'child') {
    consentDesc = `${guardianName || '[Parent/Guardian name]'} confirms that they are making these choices on behalf of their child, ${firstName} ${lastName} (the patient).`;
  } else {
    consentDesc = `${guardianName || '[Consultee name]'} confirms that they are advising in the best interests of ${firstName} ${lastName} (the patient), who lacks capacity to make their own decision. They confirm that they have the legal authority to act in this capacity.`;
  }
  const consentLines = doc.splitTextToSize(consentDesc, contentW - 6);
  const consentBoxH = consentLines.length * 4.6 + 9;
  const cBoxY = drawBox(consentBoxH, [238, 244, 251], BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setColor(BLUE);
  doc.text('Basis of Consent', M + 3, cBoxY + 5);
  doc.setFont('helvetica', 'normal');
  setColor(BLACK);
  doc.setFontSize(9);
  doc.text(consentLines, M + 3, cBoxY + 9);
  y = cBoxY + consentBoxH + 4;

  // ---------- Discussion points ----------
  drawSectionHeading('Discussion Points — Understanding & Acknowledgment');
  drawWrapped('I have discussed genomic testing with my health professional and confirm that I have read and understood each of the following points:', { size: 9, style: 'italic', color: GRAY, gap: 2 });

  const discussionPoints = [
    { num: 1, title: 'Family and wider implications', statement: 'The results of my test may have implications for me and members of my family. My results may also be used to help the healthcare of members of my family and others nationally and internationally.' },
    { num: 2, title: 'Uncertainty', statement: 'The results of my test may have findings that are uncertain and not yet fully understood. This could change what my results mean for me and my treatment over time.' },
    { num: 3, title: 'Unexpected information', statement: 'The results of my test may reveal unexpected results not related to why I am having this test, including the possibility of discovering unexpected family relationships (non-paternity). I may need further tests or investigations.' },
    { num: 4, title: 'DNA storage', statement: 'Normal NHS laboratory practice is to store the DNA extracted from my sample even after my current testing is complete.' },
    { num: 5, title: 'Data storage', statement: 'The data from my genomic test will be securely stored so that it can be looked at again in the future if necessary.' },
    { num: 6, title: 'Health records', statement: 'Results from my genomic test will be part of my patient record, held in a national system only available to healthcare professionals.' },
    { num: 7, title: 'Research', statement: 'I have the opportunity to take part in research which may benefit myself or others, now or in the future.' }
  ];

  discussionPoints.forEach((p, i) => {
    const checked = !!checks[i];
    const titleText = `${p.num}. ${p.title}`;
    const stmtLines = doc.splitTextToSize(p.statement, contentW - 42);
    const blockH = 5 + stmtLines.length * 4 + 3;
    ensureSpace(blockH + 2);

    // Left accent bar
    setFill(BLUE);
    doc.rect(M, y - 3, 1.2, blockH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(BLUE);
    doc.text(titleText, M + 3, y);

    // Status pill right-aligned
    const pillText = checked ? 'ACKNOWLEDGED' : 'NOT ACKNOWLEDGED';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const pillW = doc.getTextWidth(pillText) + 4;
    setFill(checked ? [230, 245, 235] : [253, 232, 232]);
    setDraw(checked ? GREEN : RED);
    doc.setLineWidth(0.3);
    doc.roundedRect(pageW - M - pillW, y - 3.5, pillW, 5, 1, 1, 'FD');
    setColor(checked ? GREEN : RED);
    doc.text(pillText, pageW - M - pillW + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor([60, 60, 60]);
    doc.text(stmtLines, M + 3, y + 4);
    y += blockH + 1.5;
  });

  y += 2;

  // ---------- Research choices ----------
  drawSectionHeading('Research Choices');

  function drawChoiceBox(label, yes, no) {
    const labelLines = doc.splitTextToSize(label, contentW - 26);
    const h = Math.max(9, labelLines.length * 4.4 + 4);
    ensureSpace(h + 2);
    const startY = y;
    let fill = [245, 246, 249];
    let border = BLUE;
    let valueColor = BLACK;
    let valueText = 'Not selected';
    if (yes) { fill = [230, 245, 235]; border = GREEN; valueColor = GREEN; valueText = 'YES'; }
    else if (no) { fill = [253, 232, 232]; border = RED; valueColor = RED; valueText = 'NO'; }
    setFill(fill); setDraw(border); doc.setLineWidth(0.4);
    doc.roundedRect(M, startY, contentW, h, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(BLACK);
    doc.text(labelLines, M + 3, startY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(valueColor);
    const vW = doc.getTextWidth(valueText);
    doc.text(valueText, pageW - M - 3 - vW, startY + h / 2 + 1.5);
    y = startY + h + 2;
  }

  drawChoiceBox('A. I have discussed taking part in the National Genomic Research Library', aYes, aNo);
  drawChoiceBox('B. I agree that my data and remainder sample may contribute to the Research Library', bYes, bNo);

  // ---------- Declaration ----------
  drawSectionHeading('Declaration of Understanding');
  const allAck = checks.every(Boolean);
  const declItems = [
    {
      text: allAck
        ? 'I confirm that I have read and understood all 7 discussion points above.'
        : 'WARNING: Not all discussion points have been acknowledged.',
      bold: true,
      warn: !allAck
    },
    { text: 'I confirm that I have had the opportunity to ask questions about genomic testing and the information has been explained to me.' },
    { text: 'I understand that my research choice (above) is voluntary and does not affect my clinical care.' },
    { text: 'I agree to proceed with the genomic test, and my choices are recorded above.' }
  ];
  if (consentBasis.value !== 'self') {
    declItems.push({ text: `I confirm that I am authorised to make these choices as: ${consentBasis.label}.` });
  }
  const markerSize = 2.6;
  const markerIndent = 5;
  declItems.forEach((item) => {
    ensureSpace(6);
    const markerY = y - 2.4;
    if (item.warn) {
      // Red filled square marker for warning
      setFill(RED);
      doc.rect(M, markerY, markerSize, markerSize, 'F');
    } else {
      // Green filled square with a drawn check mark
      setFill(GREEN);
      doc.rect(M, markerY, markerSize, markerSize, 'F');
      setDraw([255, 255, 255]);
      doc.setLineWidth(0.45);
      doc.line(M + 0.55, markerY + markerSize / 2, M + markerSize * 0.45, markerY + markerSize - 0.5);
      doc.line(M + markerSize * 0.45, markerY + markerSize - 0.5, M + markerSize - 0.4, markerY + 0.5);
    }
    drawWrapped(item.text, {
      size: 9,
      style: item.bold ? 'bold' : 'normal',
      color: item.warn ? RED : BLACK,
      x: M + markerIndent,
      maxWidth: contentW - markerIndent,
      gap: 0.5
    });
  });
  y += 2;

  // ---------- Signatures ----------
  drawSectionHeading('Signatures');

  function drawSignatureBlock(roleLabel, name, dateIso, sigDataUrl) {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(BLUE);
    doc.text(roleLabel, M, y);
    doc.setFont('helvetica', 'normal');
    setColor(BLACK);
    doc.text(name || '—', M + 42, y);

    doc.setFont('helvetica', 'bold');
    setColor(BLUE);
    doc.text('Date:', pageW - M - 40, y);
    doc.setFont('helvetica', 'normal');
    setColor(BLACK);
    doc.text(fmtPdfDate(dateIso), pageW - M - 27, y);
    y += 3;

    if (sigDataUrl) {
      try {
        // Draw a light frame
        setDraw([200, 200, 200]);
        doc.setLineWidth(0.3);
        doc.rect(M, y, contentW, 18);
        doc.addImage(sigDataUrl, 'PNG', M + 1, y + 1, contentW - 2, 16);
        y += 20;
      } catch (e) {
        // If the image fails (e.g. CORS), show the placeholder instead
        drawSignaturePlaceholder();
      }
    } else {
      drawSignaturePlaceholder();
    }
  }

  function drawSignaturePlaceholder() {
    ensureSpace(12);
    setDraw([160, 160, 160]);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.3);
    doc.rect(M, y, contentW, 10);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(GRAY);
    doc.text('Signature to be completed on printed form', pageW / 2, y + 6, { align: 'center' });
    y += 12;
  }

  const signingDate = date || new Date().toISOString().slice(0, 10);
  if (consentBasis.value === 'self') {
    drawSignatureBlock('Patient:', `${firstName} ${lastName}`.trim(), signingDate, patientSignature);
  } else {
    drawSignatureBlock('Patient:', `${firstName} ${lastName}`.trim(), signingDate, patientSignature);
    const roleName = consentBasis.value === 'child' ? 'Parent / Guardian:' : 'Consultee:';
    drawSignatureBlock(roleName, guardianName, guardianDate || signingDate, guardianSignature);
  }
  y += 2;

  // ---------- HCP section ----------
  drawSectionHeading('Healthcare Professional Use Only');
  if (remoteConsent) {
    drawWrapped('Remote consent: recorded remotely by clinician (no patient signature).', { size: 9, style: 'italic', color: GRAY, gap: 1 });
  }
  drawLabelValue('Responsible clinician:', hcpClinician || '—');
  drawLabelValue('Hospital number:', hcpHospital || '—');
  drawLabelValue('HCP name:', hcpName || '—');
  drawLabelValue('HCP date:', fmtPdfDate(hcpDate));

  // Patient categories
  const patientCategoryLabels = {
    'adult': 'Adult (made their own choices)',
    'adult-lacking': 'Adult lacking capacity (choices advised by consultee)',
    'child': 'Child (parent or guardian choices)',
    'clinician-agreed': 'Clinician has agreed to the test (in the patient\u2019s best interests)',
    'deceased': 'Deceased (choices made on behalf of deceased individual)'
  };
  const testTypeLabels = {
    'rare-disease': 'Rare and Inherited Diseases — WGS',
    'cancer': 'Cancer (paired tumour/normal) — WGS'
  };
  const researchNoLabels = {
    'discuss-later': 'Patient would like to discuss at a later date',
    'inappropriate': 'Inappropriate to have discussion',
    'lacks-capacity': 'Patient lacks capacity and no consultee available',
    'other': 'Other'
  };

  if (patientCategories && patientCategories.length) {
    drawWrapped('Patient category: ' + patientCategories.map(v => patientCategoryLabels[v] || v).join('; '), { size: 9 });
  } else {
    drawLabelValue('Patient category:', '—');
  }
  drawLabelValue('Test type:', testType ? (testTypeLabels[testType] || testType) : '—');
  if (researchNoReasons && researchNoReasons.length) {
    drawWrapped('Reason(s) for declining research: ' + researchNoReasons.map(v => researchNoLabels[v] || v).join('; '), { size: 9 });
  }
  y += 1;
  drawSignatureBlock('HCP signature:', hcpName || '—', hcpDate || signingDate, hcpSignature);

  // ---------- Footer on every page ----------
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    setColor(GRAY);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Generated ${dateStr} at ${timeStr}  |  No data was collected or transmitted by the WGS Guide website.`, pageW / 2, pageH - 8, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}  |  This is a companion summary — the official 01-NGIS-ROD v4.03 form must be signed with your clinician.`, pageW / 2, pageH - 5, { align: 'center' });
  }
}

function generatePdf() {
  const data = getFormDataForPdf();
  loadJsPdf().then((jspdf) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    renderPdfDocument(doc, data);
    const filename = `RoD-${safeFilename(data.firstName)}-${safeFilename(data.lastName)}.pdf`;
    doc.save(filename);
    showToast('PDF downloaded');
  }).catch((err) => {
    console.warn('jsPDF unavailable, falling back to print dialog:', err);
    showToast('PDF library unavailable — opening print dialog');
    // Fallback: old print-to-PDF path
    const html = buildPdfHtml(data);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to download the form, or try again on a desktop browser.');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  });
}

function emailPdf() {
  const data = getFormDataForPdf();
  const subject = encodeURIComponent(`Record of Discussion — ${data.firstName} ${data.lastName} — Genomic Testing`);
  const body = encodeURIComponent(
    `Dear Consultant,\n\n` +
    `Please find attached my completed Record of Discussion Regarding Genomic Testing.\n\n` +
    `Patient: ${data.firstName} ${data.lastName}\n` +
    `Date of Birth: ${data.dob || 'Not provided'}\n` +
    `NHS Number: ${data.nhsNumber || 'Not provided'}\n` +
    `Consent Basis: ${data.consentBasis.label}\n\n` +
    `Discussion Points Acknowledged: ${data.checks.filter(c => c).length} of 7\n` +
    `Research Library Discussion: ${data.aYes ? 'YES' : 'NO'}\n` +
    `Data Contribution to Research: ${data.bYes ? 'YES' : 'NO'}\n\n` +
    `I have read and understood the information provided about whole genome sequencing and have recorded my choices. ` +
    `Please see the attached PDF for the full record.\n\n` +
    `Kind regards,\n` +
    `${data.consentBasis.value === 'self' ? data.firstName + ' ' + data.lastName : (data.guardianName || '[Parent/Guardian/Consultee name]')}\n\n` +
    `---\n` +
    `Note: Please download the PDF from the WGS Guide website first, then attach it to this email before sending.`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  showToast('Email client opened — please attach your downloaded PDF');
}

/* ============ HELPERS ============ */
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--color-success);color:white;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;z-index:9999;animation:fadeInUp 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
