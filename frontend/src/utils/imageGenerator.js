/**
 * Generate a beautiful canvas-based thumbnail for a debate room.
 * The thumbnail is deterministic — same room name always produces the same image.
 * It renders the room name as the focal point with a unique gradient background,
 * debate-themed icon, and decorative elements.
 *
 * @param {string} roomName - The name of the room
 * @param {string} style - Optional style (unused, kept for API compat)
 * @param {string} provider - Optional provider (unused, kept for API compat)
 * @returns {string} A data URL (base64 PNG) of the generated thumbnail
 */

// ── Color Palettes (curated for debate/discussion vibes) ──────────────────
const PALETTES = [
  { bg: ["#0f0c29", "#302b63", "#24243e"], accent: "#a78bfa", text: "#ffffff" },
  { bg: ["#1a1a2e", "#16213e", "#0f3460"], accent: "#e94560", text: "#ffffff" },
  { bg: ["#0d1117", "#161b22", "#21262d"], accent: "#58a6ff", text: "#f0f6fc" },
  { bg: ["#1b1b2f", "#162447", "#1f4068"], accent: "#e43f5a", text: "#ffffff" },
  { bg: ["#0b0b0f", "#1a1a2e", "#2d2d44"], accent: "#ffd700", text: "#ffffff" },
  { bg: ["#141e30", "#243b55", "#2c5364"], accent: "#00d2ff", text: "#ffffff" },
  { bg: ["#0f2027", "#203a43", "#2c5364"], accent: "#2ecc71", text: "#ffffff" },
  { bg: ["#200122", "#6f0000", "#3d0000"], accent: "#ff6b6b", text: "#ffffff" },
  { bg: ["#1d1d3b", "#2b2b5e", "#3e3e7e"], accent: "#f093fb", text: "#ffffff" },
  { bg: ["#0a0a1a", "#1a1a3e", "#2a2a5e"], accent: "#ff9f43", text: "#ffffff" },
];

// ── Debate-themed SVG icons (drawn on canvas) ─────────────────────────────
const ICONS = [
  // Microphone
  (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const s = size * 0.4;
    // Mic body
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.3, s * 0.3, s * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Stand
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.2);
    ctx.lineTo(x, y + s * 0.7);
    ctx.stroke();
    // Base
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y + s * 0.7);
    ctx.lineTo(x + s * 0.3, y + s * 0.7);
    ctx.stroke();
    // Arc around mic
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.5, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.stroke();
  },
  // Speech bubbles
  (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const s = size * 0.4;
    // Left bubble
    ctx.beginPath();
    ctx.roundRect(x - s * 0.9, y - s * 0.6, s * 0.9, s * 0.6, s * 0.1);
    ctx.stroke();
    // Left tail
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y);
    ctx.lineTo(x - s * 0.8, y + s * 0.3);
    ctx.lineTo(x - s * 0.4, y);
    ctx.stroke();
    // Right bubble
    ctx.beginPath();
    ctx.roundRect(x, y - s * 0.3, s * 0.9, s * 0.6, s * 0.1);
    ctx.stroke();
    // Right tail
    ctx.beginPath();
    ctx.moveTo(x + s * 0.5, y + s * 0.3);
    ctx.lineTo(x + s * 0.7, y + s * 0.55);
    ctx.lineTo(x + s * 0.3, y + s * 0.3);
    ctx.stroke();
  },
  // Podium / Lectern
  (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const s = size * 0.4;
    // Top
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.4);
    ctx.lineTo(x + s * 0.6, y - s * 0.4);
    ctx.stroke();
    // Body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y - s * 0.4);
    ctx.lineTo(x - s * 0.4, y + s * 0.6);
    ctx.lineTo(x + s * 0.4, y + s * 0.6);
    ctx.lineTo(x + s * 0.6, y - s * 0.4);
    ctx.stroke();
    // Mic on top
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y - s * 0.4);
    ctx.lineTo(x + s * 0.3, y - s * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.3, y - s * 0.8, s * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  },
  // Lightning bolt (energy/debate)
  (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    const s = size * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.1, y - s * 0.8);
    ctx.lineTo(x - s * 0.3, y + s * 0.05);
    ctx.lineTo(x + s * 0.05, y + s * 0.05);
    ctx.lineTo(x - s * 0.1, y + s * 0.8);
    ctx.lineTo(x + s * 0.3, y - s * 0.05);
    ctx.lineTo(x - s * 0.05, y - s * 0.05);
    ctx.closePath();
    ctx.stroke();
  },
  // Scales of justice
  (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const s = size * 0.4;
    // Center post
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.7);
    ctx.lineTo(x, y + s * 0.7);
    ctx.stroke();
    // Base
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y + s * 0.7);
    ctx.lineTo(x + s * 0.3, y + s * 0.7);
    ctx.stroke();
    // Beam
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y - s * 0.4);
    ctx.lineTo(x + s * 0.7, y - s * 0.4);
    ctx.stroke();
    // Top
    ctx.beginPath();
    ctx.arc(x, y - s * 0.7, s * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    // Left pan
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y - s * 0.4);
    ctx.lineTo(x - s * 0.7, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - s * 0.7, y + s * 0.05, s * 0.2, 0, Math.PI);
    ctx.stroke();
    // Right pan
    ctx.beginPath();
    ctx.moveTo(x + s * 0.7, y - s * 0.4);
    ctx.lineTo(x + s * 0.7, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + s * 0.7, y + s * 0.05, s * 0.2, 0, Math.PI);
    ctx.stroke();
  },
];

// ── Hash function to get deterministic values from room name ──────────────
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

// ── Seeded random for deterministic generation ────────────────────────────
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

// ── Word-wrap helper ──────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ── Thumbnail cache to avoid re-rendering ─────────────────────────────────
const thumbnailCache = new Map();

/**
 * Generate a beautiful thumbnail image based on the room name.
 * Renders the room name as text, with a unique gradient, icon, and style.
 *
 * @param {string} roomName - The name of the room to generate image for
 * @param {string} style - Optional style/theme for the image (kept for API compat)
 * @param {string} provider - Optional provider (kept for API compat)
 * @returns {string} data URL (base64 PNG) of the generated thumbnail
 */
export const generateRoomThumbnail = (roomName, style = "debate", provider = "canvas") => {
  if (!roomName || !roomName.trim()) {
    return generateDefaultThumbnail();
  }

  const cacheKey = roomName.trim().toLowerCase();
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey);
  }

  const width = 600;
  const height = 400;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const hash = hashString(cacheKey);
  const rand = seededRandom(hash);

  // ── Pick palette ──
  const palette = PALETTES[hash % PALETTES.length];

  // ── Draw gradient background ──
  const gradAngle = rand() * Math.PI * 2;
  const gx1 = width / 2 + Math.cos(gradAngle) * width * 0.6;
  const gy1 = height / 2 + Math.sin(gradAngle) * height * 0.6;
  const gx2 = width / 2 - Math.cos(gradAngle) * width * 0.6;
  const gy2 = height / 2 - Math.sin(gradAngle) * height * 0.6;
  const gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
  gradient.addColorStop(0, palette.bg[0]);
  gradient.addColorStop(0.5, palette.bg[1]);
  gradient.addColorStop(1, palette.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // ── Decorative grid dots ──
  ctx.fillStyle = palette.accent + "12";
  const spacing = 30;
  for (let gx = 0; gx < width; gx += spacing) {
    for (let gy = 0; gy < height; gy += spacing) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Floating geometric shapes ──
  for (let i = 0; i < 6; i++) {
    const sx = rand() * width;
    const sy = rand() * height;
    const sr = 20 + rand() * 60;
    const alpha = 0.04 + rand() * 0.06;
    ctx.strokeStyle = palette.accent + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (rand() > 0.5) {
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    } else {
      ctx.roundRect(sx - sr / 2, sy - sr / 2, sr, sr, sr * 0.15);
    }
    ctx.stroke();
  }

  // ── Draw icon in the top-left area (subtle) ──
  const iconIndex = hash % ICONS.length;
  const iconFn = ICONS[iconIndex];
  ctx.globalAlpha = 0.15;
  iconFn(ctx, 80, 80, 100, palette.accent);
  ctx.globalAlpha = 1;

  // ── Draw the room name as the focal text ──
  const maxTextWidth = width - 80;
  let fontSize = 42;
  ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;

  // Word-wrap
  let lines = wrapText(ctx, roomName, maxTextWidth);

  // Shrink font if too many lines
  while (lines.length > 3 && fontSize > 22) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px 'Inter', 'Segoe UI', sans-serif`;
    lines = wrapText(ctx, roomName, maxTextWidth);
  }

  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = (height - totalTextHeight) / 2 + fontSize * 0.3;

  // ── Text glow effect ──
  ctx.shadowColor = palette.accent + "80";
  ctx.shadowBlur = 30;
  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], width / 2, textStartY + i * lineHeight);
  }
  ctx.shadowBlur = 0;

  // ── Accent bar under text ──
  const barY = textStartY + totalTextHeight + 15;
  const barWidth = Math.min(200, width * 0.35);
  const barGrad = ctx.createLinearGradient(
    width / 2 - barWidth / 2, barY,
    width / 2 + barWidth / 2, barY
  );
  barGrad.addColorStop(0, palette.accent + "00");
  barGrad.addColorStop(0.3, palette.accent);
  barGrad.addColorStop(0.7, palette.accent);
  barGrad.addColorStop(1, palette.accent + "00");
  ctx.fillStyle = barGrad;
  ctx.fillRect(width / 2 - barWidth / 2, barY, barWidth, 3);

  // ── "DEBATE" label at bottom ──
  ctx.font = `600 12px 'Inter', 'Segoe UI', sans-serif`;
  ctx.fillStyle = palette.accent + "99";
  ctx.letterSpacing = "4px";
  ctx.textAlign = "center";
  ctx.fillText("D  E  B  A  T  E", width / 2, height - 25);

  // ── Corner accents ──
  ctx.strokeStyle = palette.accent + "40";
  ctx.lineWidth = 2;
  const cornerSize = 20;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(15, 15 + cornerSize);
  ctx.lineTo(15, 15);
  ctx.lineTo(15 + cornerSize, 15);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - 15 - cornerSize, 15);
  ctx.lineTo(width - 15, 15);
  ctx.lineTo(width - 15, 15 + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(15, height - 15 - cornerSize);
  ctx.lineTo(15, height - 15);
  ctx.lineTo(15 + cornerSize, height - 15);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 15 - cornerSize, height - 15);
  ctx.lineTo(width - 15, height - 15);
  ctx.lineTo(width - 15, height - 15 - cornerSize);
  ctx.stroke();

  // ── Subtle vignette ──
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.3,
    width / 2, height / 2, width * 0.75
  );
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/png");
  thumbnailCache.set(cacheKey, dataUrl);
  return dataUrl;
};

/**
 * Generate a default thumbnail when room name is not available
 * @returns {string} data URL of a generic debate thumbnail
 */
export const generateDefaultThumbnail = () => {
  return generateRoomThumbnail("Debate Room", "debate", "canvas");
};

/**
 * Generate multiple thumbnails for rooms
 * @param {Array} rooms - Array of room objects with roomName property
 * @param {string} style - Optional style/theme for images
 * @param {string} provider - Optional provider preference
 * @returns {Array} Array of data URLs corresponding to rooms
 */
export const generateRoomThumbnails = (rooms, style = "debate", provider = "canvas") => {
  return rooms.map((room) => generateRoomThumbnail(room.roomName, style, provider));
};
