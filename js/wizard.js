/* WGS Record of Discussion — Wizard
 *
 * The 3-step form wizard: step navigation, progress bar, step-1
 * validation (with firstInvalid scroll-and-focus for mobile),
 * discussion-point expand/collapse (ARIA wired), and research
 * choice cards.
 *
 * `goToStep` is module-level (not nested inside initFormSteps) so
 * startNewForm in form.js can call it when resetting the wizard.
 *
 * Progress-bar formula: ((n - 1) / 2) * 100 — step 1 is 0% done,
 * step 2 is 50%, step 3 is 100%. DO NOT revert to hard-coded
 * 33/66/100; that put step 1 at 33% and was a real bug.
 */

function goToStep(n) {
  const steps = document.querySelectorAll('.form-step');
  const indicators = document.querySelectorAll('.step');
  const connectors = document.querySelectorAll('.step__connector');
  const progressFill = document.getElementById('progress-fill');

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
  if (progressFill) progressFill.style.width = `${((n - 1) / 2) * 100}%`;

  // Update progress bar ARIA attributes and visible label
  const progressBar = document.querySelector('[role="progressbar"]');
  const progressLabel = document.getElementById('progress-label');
  const stepTitles = ['Discussion Points', 'Research Choices', 'Confirmation'];
  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(((n - 1) / 2) * 100));
    progressBar.setAttribute('aria-label', `Form progress: Step ${n} of 3`);
  }
  if (progressLabel) {
    progressLabel.textContent = `Step ${n} of 3 — ${stepTitles[n - 1]}`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Auto-fill patient name on step 3 and populate choice summary
  if (n === 3) {
    const fn = document.getElementById('first-name').value;
    const ln = document.getElementById('last-name').value;
    document.getElementById('sig-patient-name').value = `${fn} ${ln}`.trim();
    const today = new Date().toISOString().split('T')[0];
    if (!document.getElementById('sig-date').value) {
      document.getElementById('sig-date').value = today;
    }

    // Populate choice summary
    const choiceAYes = document.getElementById('choice-a-yes');
    const choiceBYes = document.getElementById('choice-b-yes');
    const summaryText = document.getElementById('choice-summary-text');

    let summary = '';
    if (choiceAYes && choiceAYes.classList.contains('selected')) {
      summary += '✓ A. Yes, I have discussed taking part in the National Genomic Research Library<br>';
      if (choiceBYes && choiceBYes.classList.contains('selected')) {
        summary += '✓ B. Yes, I agree that my data and remainder sample may contribute to the library';
      } else {
        summary += '✗ B. No, I do not agree to contribute data and samples';
      }
    } else {
      summary = '✗ A. No, I have not discussed taking part in the National Genomic Research Library<br><em>(Choice B is not applicable)</em>';
    }

    if (summaryText) {
      summaryText.innerHTML = summary;
    }
  }
}

function initFormSteps() {
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
