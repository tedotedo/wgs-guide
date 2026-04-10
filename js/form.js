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

    progressFill.style.width = `${(n / 3) * 100}%`;
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

  // Validate consent basis
  if (!consentBasis) {
    valid = false;
  }

  [firstName, lastName, dob].forEach(field => {
    if (!field.value.trim()) {
      field.classList.add('error');
      valid = false;
    } else {
      field.classList.remove('error');
    }
  });

  let allChecked = true;
  checks.forEach(c => { if (!c.checked) allChecked = false; });

  if (!allChecked) valid = false;

  if (alertEl) {
    alertEl.style.display = valid ? 'none' : 'flex';
    if (!valid && !consentBasis) {
      alertEl.querySelector('.alert__text').innerHTML = 'Please select who this form is for, complete all required fields, and confirm you understand all 7 discussion points before proceeding.';
    } else if (!valid) {
      alertEl.querySelector('.alert__text').innerHTML = 'Please complete all required fields and confirm you understand all 7 discussion points before proceeding.';
    }
  }
  return valid;
}

/* ============ DISCUSSION POINTS ============ */
function initDiscussionPoints() {
  // Expand/collapse explanations
  document.querySelectorAll('.discussion-point__expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        target.classList.toggle('open');
        btn.textContent = target.classList.contains('open')
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

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 16;
    canvas.height = 150;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#1A1F2E';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  resize();
  window.addEventListener('resize', resize);

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
    hcpClinician: document.getElementById('hcp-clinician')?.value || '',
    hcpHospital: document.getElementById('hcp-hospital')?.value || '',
    hcpName: document.getElementById('hcp-name')?.value || '',
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
    if (data.hcpClinician) document.getElementById('hcp-clinician').value = data.hcpClinician;
    if (data.hcpHospital) document.getElementById('hcp-hospital').value = data.hcpHospital;
    if (data.hcpName) document.getElementById('hcp-name').value = data.hcpName;

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
  document.getElementById('download-pdf')?.addEventListener('click', generatePdf);
  document.getElementById('email-pdf')?.addEventListener('click', emailPdf);
}

function getConsentBasis() {
  const sel = document.querySelector('input[name="consent-basis"]:checked');
  if (!sel) return { value: 'self', label: 'The patient (making choices for themselves)' };
  const labels = {
    'self': 'The patient (making choices for themselves)',
    'child': 'A parent / guardian (making choices on behalf of their child)',
    'best-interests': 'A consultee (advising on behalf of an adult who lacks capacity, in their best interests)'
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

  return { firstName, lastName, nhsNumber, dob, date, guardianName, guardianDate, consentBasis, checks, aYes, aNo, bYes, bNo };
}

function buildPdfHtml(data) {
  const { firstName, lastName, nhsNumber, dob, date, guardianName, guardianDate, consentBasis, checks, aYes, aNo, bYes, bNo } = data;
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
    consentDesc = `<strong>${guardianName || '[Consultee name]'}</strong> confirms that they are advising <strong>in the best interests</strong> of <strong>${firstName} ${lastName}</strong> (the patient), who lacks capacity to make their own decision.`;
  }

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
<div class="sig-area">Patient signature — to be completed on printed form</div>
` : `
<table class="sig-table">
  <tr><td style="width:60%"><strong>Patient name:</strong> ${firstName} ${lastName}</td><td><strong>Date of birth:</strong> ${dob}</td></tr>
</table>
<table class="sig-table" style="margin-top:8px">
  <tr><td style="width:60%"><strong>${consentBasis.value === 'child' ? 'Parent / Guardian' : 'Consultee'} name:</strong> ${guardianName || '[To be completed]'}</td><td><strong>Date:</strong> ${guardianDate || date || dateStr}</td></tr>
</table>
<div class="sig-area">${consentBasis.value === 'child' ? 'Parent / Guardian' : 'Consultee'} signature — to be completed on printed form</div>
`}

<table class="sig-table" style="margin-top:12px">
  <tr><td colspan="2" style="background:#f0f0f0;font-weight:bold">Healthcare Professional Use Only</td></tr>
  <tr><td><strong>HCP name:</strong> _________________________</td><td><strong>Date:</strong> _________________________</td></tr>
</table>
<div class="sig-area">Healthcare professional signature — to be completed on printed form</div>

<div class="footer">
  <p><strong>This document is a record of the patient's understanding and choices regarding genomic testing.</strong></p>
  <p>Please print, sign, and email or hand to your consultant. The official NHS Record of Discussion form (01-NGIS-ROD v4.03) should be submitted to your Genomic Laboratory Hub.</p>
  <p>Generated: ${dateStr} at ${timeStr}</p>
</div>

<div class="privacy">No data from this form was collected or transmitted by the WGS Guide website. All information was processed locally in the user's browser only.</div>

</body></html>`;
}

function generatePdf() {
  const data = getFormDataForPdf();
  const html = buildPdfHtml(data);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
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
