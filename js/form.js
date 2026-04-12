/* WGS Record of Discussion — Form Orchestrator
 *
 * Thin entry point for form.html. The form logic was split into four
 * dependency modules (signature-pads.js, persistence.js, pdf-render.js,
 * wizard.js) so each concern can be read, tested, and extended in
 * isolation. This file:
 *
 *   - Defines shared helpers (debounce, showToast) used by the other
 *     modules at runtime. They live here so there's no fifth file just
 *     for two tiny utilities.
 *   - Defines startNewForm — a cross-cutting reset orchestrator that
 *     clears localStorage, resets every widget, and walks the wizard
 *     back to step 1 via goToStep (promoted to module-level in
 *     wizard.js so this call works cleanly).
 *   - On DOMContentLoaded, initialises all the modules in order.
 */

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

/* ============ RESET ORCHESTRATOR ============ */
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
  const prompt = document.getElementById('new-form-prompt');
  if (prompt) prompt.style.display = 'none';

  // Walk the wizard back to step 1
  goToStep(1);

  showToast('Form cleared — ready for a new entry');
}

/* ============ BOOTSTRAP ============ */
document.addEventListener('DOMContentLoaded', () => {
  initFormSteps();
  initDiscussionPoints();
  initChoiceCards();
  initSignaturePads();
  initAutoSave();
  loadSavedData();
  initPdfDownload();
  // start-new-form lives here rather than initPdfDownload because it's a
  // reset action, not a PDF action.
  document.getElementById('start-new-form')?.addEventListener('click', startNewForm);
});
