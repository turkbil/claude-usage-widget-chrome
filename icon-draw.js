// Renders the toolbar icon as ImageData. Chrome accepts ImageData directly
// via chrome.action.setIcon({ imageData }).
//
// The composition follows the user's prefs:
//   • icon prefix (emoji / custom / donut summary / nothing)
//   • per-metric mode (hidden / text / donut)
//
// Toolbar icons are tiny (typically 32×32 at @2x). We rasterize a square
// canvas — the most useful single piece of info first. Side-by-side text +
// rings don't fit in 32px width, so for browser action we prioritize:
//   1. Donut prefix? → render the donut at full canvas
//   2. Otherwise → render the weekly% number, optionally over a colored donut

const SIZE = 32;
// Thin ring so the number in the middle can stay readable at toolbar size.
const RING_THICKNESS = 2;
const ACTIVE_THICKNESS = 3;
const INNER_DIAMETER = SIZE - 2 * (RING_THICKNESS + 1);

export function drawIcon(snapshot, prefs, isError) {
  // OffscreenCanvas works in service workers (MV3).
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, SIZE, SIZE);

  if (isError || !snapshot) {
    drawText(ctx, '?', colorFor(0), 22);
    return ctx.getImageData(0, 0, SIZE, SIZE);
  }

  const pct = Math.round(snapshot.weeklyUtilization);
  const wantDonut =
    prefs.iconType === 'donut' || prefs.weeklyPctMode === 'donut';

  if (wantDonut) {
    drawDonut(ctx, pct / 100, hexToRgb(prefs.weeklyPctColor || '#d68c45'));
    // Number inside the ring, as large as the ring's inner hole allows. Taller
    // 1–2 digit numbers need extra side margin so their corners clear the curve.
    const label = String(pct);
    const maxWidth = INNER_DIAMETER - (label.length >= 3 ? 1 : 3);
    drawText(ctx, label, '#ffffff', fitSize(ctx, label, maxWidth, 24), true);
  } else if (prefs.weeklyPctMode === 'text' || prefs.iconType === 'none') {
    drawText(ctx, String(pct), colorFor(pct), pct >= 100 ? 16 : 18);
  } else if (prefs.iconType === 'emoji' || prefs.iconType === 'custom') {
    // Show just the emoji (no number). Color-emoji fonts are frequently
    // unavailable inside an MV3 service-worker OffscreenCanvas, which would
    // leave the toolbar icon blank. Detect that and fall back to the number.
    drawEmoji(ctx, prefs.iconValue || '🤖');
    if (isBlank(ctx)) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      drawText(ctx, String(pct), colorFor(pct), pct >= 100 ? 16 : 18);
    }
  } else {
    drawText(ctx, String(pct), colorFor(pct), 18);
  }

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

const FONT = '"Segoe UI", -apple-system, "Helvetica Neue", sans-serif';

// Largest bold font size (≤ max) whose text width fits within maxWidth.
function fitSize(ctx, text, maxWidth, max) {
  let size = max;
  for (; size > 8; size--) {
    ctx.font = `bold ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

function drawText(ctx, text, color, size = 18, shadow = false) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 2;
  }
  ctx.fillText(text, SIZE / 2, SIZE / 2 + 1);
  ctx.shadowBlur = 0;
}

function drawEmoji(ctx, emoji) {
  ctx.font = '24px "Apple Color Emoji", "Segoe UI Emoji", emoji';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, SIZE / 2, SIZE / 2 + 1);
}

function drawDonut(ctx, fill, rgb) {
  const cx = SIZE / 2, cy = SIZE / 2;
  // Both rings share the same outer edge; the filled arc is thicker and the
  // track fainter so used vs. remaining reads clearly at toolbar size.
  const outer = SIZE / 2 - 1;

  // Track (remaining)
  ctx.beginPath();
  ctx.arc(cx, cy, outer - RING_THICKNESS / 2, 0, Math.PI * 2);
  ctx.lineWidth = RING_THICKNESS;
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.stroke();

  if (fill <= 0) return;
  // Fill arc (used) — start at top, clockwise. Butt caps keep the gap before
  // 100% visible instead of rounding it shut.
  ctx.beginPath();
  const sweep = Math.min(1, fill) * Math.PI * 2;
  ctx.arc(cx, cy, outer - ACTIVE_THICKNESS / 2, -Math.PI / 2, -Math.PI / 2 + sweep);
  ctx.lineWidth = ACTIVE_THICKNESS;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = rgb;
  ctx.stroke();
}

// True when the canvas has almost no painted pixels — used to detect when an
// emoji glyph failed to rasterize (e.g. no color-emoji font in the worker).
function isBlank(ctx) {
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  let painted = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 10) painted++;
  return painted < 8;
}

function colorFor(pct) {
  if (pct >= 90) return '#eb5a5a';
  if (pct >= 75) return '#f5a53c';
  if (pct >= 50) return '#ebd246';
  return '#50c86e';
}

function hexToRgb(hex) {
  // Accept "#rrggbb" and return rgb string.
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#d68c45';
  return '#' + m[1];
}
