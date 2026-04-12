/* WGS Record of Discussion — Signature Pads
 *
 * Canvas-based signature capture for patient / guardian / HCP.
 * Key invariant: NEVER re-declare canvas.width / canvas.height without
 * first snapshotting via toDataURL and restoring — bare assignment wipes
 * the drawing buffer, which silently destroyed signatures on mobile
 * keyboard-up / orientation-change resize events. Debounce the resize
 * listener to 150ms so rapid animations don't thrash.
 */

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
