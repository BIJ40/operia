/**
 * Canvas helpers — V4 "Zone-Based Layout Engine"
 * Strict zone system preventing text overflow, collision, and truncation.
 * 
 * ZONES (1080x1080):
 *   ZONE 1 — Top bar: 0–100px (logo + universe pill) 
 *   ZONE 2 — Image/visual center: 100–640px (no text)
 *   ZONE 3 — Text block: 640–920px (hook + subtext)
 *   ZONE 4 — CTA: 920–990px (button only)
 *   ZONE 5 — Footer: 990–1080px (brand signature)
 */

export const SIZE = 1080;

// ─── HC Brand Colors ────────────────────────────────────────
export const HC = {
  blue:      '#0092DD',
  blueDark:  '#006FAA',
  orange:    '#FFB705',
  orangeDark:'#E5A200',
  grayDark:  '#2F2F2F',
  white:     '#FFFFFF',
} as const;

// ─── Zone boundaries (Y coordinates) ────────────────────────
export const ZONES = {
  TOP_START: 0,
  TOP_END: 100,       // Logo + pills
  IMAGE_START: 100,
  IMAGE_END: 620,     // Pure image zone
  TEXT_START: 660,     // Hook + subtext — LOWER, just above CTA, not mid-image
  TEXT_END: 900,       // Max bottom of text
  CTA_START: 910,     // CTA button
  CTA_END: 975,
  FOOTER_START: 985,
  FOOTER_HEIGHT: 95,
  MARGIN_X: 70,       // Left/right margin for text
  TEXT_WIDTH: 940,     // SIZE - 2*MARGIN_X
} as const;

// ─── Text constraints — STRICT (verrouillé) ────────────────
const HOOK_MAX_CHARS = 32;
const HOOK_MAX_WORDS = 5;
const HOOK_MAX_LINES = 2;
const HOOK_FONT_MAX = 58;
const HOOK_FONT_MIN = 38;

const SUB_MAX_CHARS = 60;
const SUB_MAX_WORDS = 10;
const SUB_MAX_LINES = 2;
const SUB_FONT = 30;

const CTA_MAX_CHARS = 25;
const CTA_FONT = 24;

// ─── Universe Style Map ─────────────────────────────────────
export interface ServiceTheme {
  label: string;
  bg: string;
  accent: string;
  labelColor: string;
  overlayTint: string;
}

export const SERVICE_THEMES: Record<string, ServiceTheme> = {
  plomberie:   { label: 'Plomberie',           bg: '#2D8BC9', accent: '#136AAD', labelColor: '#D6EEFF', overlayTint: 'rgba(0,146,221,0.25)' },
  electricite: { label: 'Électricité',         bg: '#F8A73C', accent: '#F68A30', labelColor: '#FFF4D6', overlayTint: 'rgba(255,183,5,0.20)' },
  serrurerie:  { label: 'Serrurerie',          bg: '#5A6A72', accent: '#3E4C54', labelColor: '#CFD8DC', overlayTint: 'rgba(47,47,47,0.25)' },
  menuiserie:  { label: 'Menuiserie',          bg: '#EF8531', accent: '#E86424', labelColor: '#FFE4D6', overlayTint: 'rgba(239,133,49,0.20)' },
  vitrerie:    { label: 'Vitrerie',            bg: '#90C14E', accent: '#62B144', labelColor: '#E4F2D6', overlayTint: 'rgba(144,193,78,0.18)' },
  volets:      { label: 'Volets roulants',     bg: '#A23189', accent: '#912982', labelColor: '#F0D6EC', overlayTint: 'rgba(162,49,137,0.18)' },
  pmr:         { label: 'Adaptation logement', bg: '#3C64A2', accent: '#2650A6', labelColor: '#D6DFEF', overlayTint: 'rgba(60,100,162,0.22)' },
  renovation:  { label: 'Rénovation',          bg: '#B79D84', accent: '#957E6E', labelColor: '#EDE5DE', overlayTint: 'rgba(183,157,132,0.20)' },
  general:     { label: 'Multi-services',      bg: HC.blue,   accent: HC.blueDark, labelColor: '#D6EEFF', overlayTint: 'rgba(0,146,221,0.22)' },
};

export function getTheme(universe?: string | null): ServiceTheme {
  return SERVICE_THEMES[universe || 'general'] || SERVICE_THEMES.general;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEXT SANITIZATION — Auto-optimize copy for canvas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Sanitize hook: max 5 words, max 32 chars, MUST be complete — never truncated */
export function sanitizeHook(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  // Remove trailing ellipsis/dots
  text = text.replace(/[…\.]+$/, '').trim();
  // Limit words (strict: 5 max)
  const words = text.split(/\s+/);
  if (words.length > HOOK_MAX_WORDS) {
    text = words.slice(0, HOOK_MAX_WORDS).join(' ');
  }
  // Limit chars (strict: 32 max)
  if (text.length > HOOK_MAX_CHARS) {
    const cut = text.slice(0, HOOK_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    text = lastSpace > 10 ? cut.slice(0, lastSpace) : cut;
  }
  // Clean trailing punctuation artifacts (but keep sentence-ending ones)
  text = text.replace(/[\s,;:]+$/, '').trim();
  return text;
}

/** Sanitize subtext: max 10 words, max 60 chars, complete sentence — never truncated */
export function sanitizeSubText(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  // Remove trailing ellipsis
  text = text.replace(/[…]+$/, '').trim();
  // Limit words (strict: 10 max)
  const words = text.split(/\s+/);
  if (words.length > SUB_MAX_WORDS) {
    let cutText = words.slice(0, SUB_MAX_WORDS).join(' ');
    // Try to cut at a natural sentence boundary
    const sentenceEnd = cutText.match(/^(.+[.!?])\s/);
    if (sentenceEnd) {
      cutText = sentenceEnd[1];
    } else {
      cutText = cutText.replace(/[\s,;:]+$/, '').trim();
      if (!/[.!?]$/.test(cutText)) cutText += '.';
    }
    text = cutText;
  }
  // Limit chars (strict: 60 max)
  if (text.length > SUB_MAX_CHARS) {
    const cut = text.slice(0, SUB_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    text = lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
    text = text.replace(/[\s,;:]+$/, '').trim();
    if (!/[.!?]$/.test(text)) text += '.';
  }
  return text;
}

/** Sanitize CTA: short action text */
export function sanitizeCTA(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  if (text.length > CTA_MAX_CHARS) {
    text = text.slice(0, CTA_MAX_CHARS).trim();
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > CTA_MAX_CHARS * 0.5) text = text.slice(0, lastSpace);
  }
  return text;
}

// Legacy compat
export function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IMAGE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image: ${src}`));
    img.src = src;
  });
}

export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgRatio > boxRatio) { sw = img.naturalHeight * boxRatio; sx = (img.naturalWidth - sw) / 2; }
  else { sh = img.naturalWidth / boxRatio; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgRatio > boxRatio) { dw = w; dh = w / imgRatio; dx = x; dy = y + (h - dh) / 2; }
  else { dh = h; dw = h * imgRatio; dx = x + (w - dw) / 2; dy = y; }
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Word-wrap text to fit within maxWidth.
 * Never produces "…" — instead drops words to keep text complete.
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines?: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Hard limit lines — drop overflow (no ellipsis)
  if (maxLines && lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  return lines;
}

export function drawGradientBg(ctx: CanvasRenderingContext2D, color1: string, color2: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZONE 1 — TOP BAR COMPONENTS (0–100px)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Logo HC en haut — icône maison + "Help Confort Landes & Pays Basque" */
export async function drawHCLogo(ctx: CanvasRenderingContext2D, logoSrc: string, position: 'top-left' | 'top-center' = 'top-left') {
  const logoH = 56;
  const agencyName = 'Help Confort';
  const agencyRegion = 'Landes & Pays Basque';
  const gap = 10;
  const padX = 14;
  const padY = 10;

  try {
    const img = await loadImage(logoSrc);
    const logoRatio = img.naturalWidth / img.naturalHeight;
    const logoW = logoH * logoRatio;

    // Measure text widths
    ctx.font = 'bold 22px sans-serif';
    const nameW = ctx.measureText(agencyName).width;
    ctx.font = '16px sans-serif';
    const regionW = ctx.measureText(agencyRegion).width;
    const textBlockW = Math.max(nameW, regionW);

    const bgW = logoW + gap + textBlockW + padX * 2;
    const bgH = logoH + padY * 2;

    const x = position === 'top-center' ? (SIZE - bgW) / 2 : 30;
    const y = 25;

    // Background pill
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    roundRect(ctx, x, y, bgW, bgH, 12);
    ctx.fill();

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    roundRect(ctx, x, y, bgW, bgH, 12);
    ctx.fill();
    ctx.restore();

    // Logo icon
    drawContain(ctx, img, x + padX, y + padY, logoW, logoH);

    // Agency name text
    const textX = x + padX + logoW + gap;
    ctx.fillStyle = HC.blueDark;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(agencyName, textX, y + padY + 22);

    // Region text
    ctx.fillStyle = HC.blue;
    ctx.font = '16px sans-serif';
    ctx.fillText(agencyRegion, textX, y + padY + 44);
  } catch {
    // ❌ LOGO NON DISPONIBLE → ne rien afficher (jamais de fallback texte)
    console.warn('[drawHCLogo] Logo image failed to load — skipping (no text fallback)');
  }
  ctx.textAlign = 'left';
}

/** Universe pill — top right, inside ZONE 1 */
export function drawUniversePill(ctx: CanvasRenderingContext2D, theme: ServiceTheme, y = 40) {
  ctx.font = 'bold 20px sans-serif';
  const pillText = theme.label.toUpperCase();
  const pillW = ctx.measureText(pillText).width + 36;
  ctx.fillStyle = theme.bg;
  roundRect(ctx, SIZE - pillW - 40, y, pillW, 40, 20);
  ctx.fill();
  ctx.fillStyle = HC.white;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, SIZE - pillW / 2 - 40, y + 27);
  ctx.textAlign = 'left';
}

/** Topic badge (e.g. "CONSEIL", "SENSIBILISATION") — in ZONE 1 */
export function drawTopicBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  options: { x?: number; y?: number; bgColor?: string; textColor?: string } = {}
) {
  const { x = ZONES.MARGIN_X, y = ZONES.TOP_END + 20, bgColor = HC.orange, textColor = HC.grayDark } = options;
  ctx.font = 'bold 18px sans-serif';
  const text = label.toUpperCase();
  const tw = ctx.measureText(text).width;
  const padX = 20;
  const padY = 10;
  const bw = tw + padX * 2;
  const bh = 18 + padY * 2;
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, bw, bh, 6);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + padX, y + bh / 2 + 6);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZONE 5 — FOOTER (990–1080px)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Bandeau signature bas "HelpConfort — DEPAN40 — Adresse" */
export function drawHCFooterBar(ctx: CanvasRenderingContext2D, theme: ServiceTheme, agencyAddress?: string) {
  const height = ZONES.FOOTER_HEIGHT;
  const y = ZONES.FOOTER_START;
  ctx.fillStyle = HC.blue;
  ctx.fillRect(0, y, SIZE, height);
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, y, SIZE, 4);
  ctx.fillStyle = HC.white;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  const signature = agencyAddress
    ? `HelpConfort — DEPAN40 — ${agencyAddress}`
    : 'HelpConfort — DEPAN40';
  ctx.fillText(signature, 50, y + height / 2 + 9);
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(theme.label, SIZE - 50, y + height / 2 + 8);
  ctx.textAlign = 'left';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZONE 3 — TEXT BLOCK (auto-fit, zone-safe)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * AUTO-FIT HOOK TEXT — Zone-safe rendering.
 * Adapts font size to fit within ZONE 3.
 * Never overflows, never truncates with "…".
 */
export function drawHookText(
  ctx: CanvasRenderingContext2D,
  rawHook: string,
  options: {
    y?: number;
    fontSize?: number;
    maxWidth?: number;
    color?: string;
    align?: 'left' | 'center';
    shadowColor?: string;
  } = {}
) {
  const {
    y = ZONES.TEXT_START,
    maxWidth = ZONES.TEXT_WIDTH,
    color = HC.white,
    align = 'left',
    shadowColor = 'rgba(0,0,0,0.6)',
  } = options;

  const hook = sanitizeHook(rawHook);
  const text = hook.toUpperCase();
  
  // Auto-fit: try decreasing font sizes until text fits in max lines
  let fontSize = options.fontSize || HOOK_FONT_MAX;
  let lines: string[] = [];
  
  while (fontSize >= HOOK_FONT_MIN) {
    ctx.font = `900 ${fontSize}px sans-serif`;
    lines = wrapText(ctx, text, maxWidth, HOOK_MAX_LINES);
    const totalH = lines.length * (fontSize * 1.15);
    // Check it fits within zone
    if (y + totalH <= ZONES.TEXT_END - 80) break; // Leave 80px for subtext
    fontSize -= 4;
  }

  ctx.font = `900 ${fontSize}px sans-serif`;
  ctx.textAlign = align;
  const lineH = fontSize * 1.15;
  const xPos = align === 'center' ? SIZE / 2 : ZONES.MARGIN_X;

  lines.forEach((line, i) => {
    const ly = y + i * lineH;
    ctx.fillStyle = shadowColor;
    ctx.fillText(line, xPos + 3, ly + 3);
    ctx.fillStyle = color;
    ctx.fillText(line, xPos, ly);
  });

  ctx.textAlign = 'left';
  return { bottomY: y + lines.length * lineH, fontSize };
}

/**
 * SUBTEXT — Single line, zone-safe.
 * Placed right below hook with gap, never overlaps CTA.
 */
export function drawSubText(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  options: {
    y?: number;
    fontSize?: number;
    maxWidth?: number;
    color?: string;
    align?: 'left' | 'center';
  } = {}
) {
  const {
    y = 780,
    fontSize = SUB_FONT,
    maxWidth = ZONES.TEXT_WIDTH,
    color = 'rgba(255,255,255,0.92)',
    align = 'left',
  } = options;

  // Don't render if would overlap CTA zone
  if (y >= ZONES.CTA_START - 10) return { bottomY: y };

  const text = sanitizeSubText(rawText);
  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const lines = wrapText(ctx, text, maxWidth, SUB_MAX_LINES);
  const lineH = fontSize * 1.35;
  const xPos = align === 'center' ? SIZE / 2 : ZONES.MARGIN_X;

  lines.forEach((line, i) => {
    const drawY = y + i * lineH;
    // Safety: don't draw into CTA zone
    if (drawY < ZONES.CTA_START - 10) {
      ctx.fillText(line, xPos, drawY);
    }
  });

  ctx.textAlign = 'left';
  return { bottomY: y + lines.length * lineH };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZONE 4 — CTA BUTTON (fixed position, never overlaps)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * CTA BUTTON — Fixed in ZONE 4. Never collides with text or footer.
 */
export function drawCTAButton(
  ctx: CanvasRenderingContext2D,
  rawCta: string,
  options: {
    y?: number;
    align?: 'left' | 'center';
    bgColor?: string;
    textColor?: string;
    fontSize?: number;
  } = {}
) {
  if (!rawCta) return;

  const cta = sanitizeCTA(rawCta);
  const {
    y = ZONES.CTA_START,
    align = 'left',
    bgColor = HC.orange,
    textColor = HC.grayDark,
    fontSize = CTA_FONT,
  } = options;

  const text = cta.toUpperCase();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const textW = ctx.measureText(text).width;
  const padX = 28;
  const padY = 14;
  const btnW = textW + padX * 2;
  const btnH = fontSize + padY * 2;

  const x = align === 'center' ? (SIZE - btnW) / 2 : ZONES.MARGIN_X;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, x + 3, y + 3, btnW, btnH, btnH / 2);
  ctx.fill();

  // Button
  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, btnW, btnH, btnH / 2);
  ctx.fill();

  // Text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + btnW / 2, y + btnH / 2 + fontSize / 3);
  ctx.textAlign = 'left';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VISUAL OVERLAYS & DECORATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Overlay teinté univers sur toute l'image */
export function drawUniverseOverlay(ctx: CanvasRenderingContext2D, theme: ServiceTheme, x = 0, y = 0, w = SIZE, h = SIZE) {
  ctx.fillStyle = theme.overlayTint;
  ctx.fillRect(x, y, w, h);
}

/** Cinematic dark overlay — strong gradient for text readability */
export function drawCinematicOverlay(ctx: CanvasRenderingContext2D, strength = 0.7) {
  // Bottom gradient (strongest — covers ZONE 3+4+5)
  const gradBot = ctx.createLinearGradient(0, ZONES.IMAGE_END - 100, 0, SIZE);
  gradBot.addColorStop(0, 'rgba(0,0,0,0)');
  gradBot.addColorStop(0.2, `rgba(0,0,0,${strength * 0.3})`);
  gradBot.addColorStop(0.5, `rgba(0,0,0,${strength * 0.65})`);
  gradBot.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradBot;
  ctx.fillRect(0, ZONES.IMAGE_END - 100, SIZE, SIZE - ZONES.IMAGE_END + 100);

  // Top gradient (subtle — ZONE 1)
  const gradTop = ctx.createLinearGradient(0, 0, 0, ZONES.TOP_END + 40);
  gradTop.addColorStop(0, `rgba(0,0,0,${strength * 0.5})`);
  gradTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, SIZE, ZONES.TOP_END + 40);
}

/** Accent bar gauche (couleur métier) */
export function drawAccentBar(ctx: CanvasRenderingContext2D, theme: ServiceTheme, width = 8) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, SIZE);
}

/** Bottom gradient (legacy compat) */
export function drawBottomGradient(ctx: CanvasRenderingContext2D, height = 400, color = 'rgba(0,0,0,0.6)') {
  const grad = ctx.createLinearGradient(0, SIZE - height, 0, SIZE);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, SIZE - height, SIZE, height);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY COMPAT — drawHCTitleBlock
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function drawHCTitleBlock(
  ctx: CanvasRenderingContext2D,
  title: string,
  options: {
    y?: number;
    align?: 'left' | 'center';
    bgColor?: string;
    maxWidth?: number;
    fontSize?: number;
  } = {}
) {
  const { y = 400, align = 'left', bgColor = HC.blue, maxWidth = SIZE - 120, fontSize = 52 } = options;
  const upperTitle = title.toUpperCase();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const lines = wrapText(ctx, upperTitle, maxWidth, 3);
  const lineH = fontSize + 14;
  const pad = 20;
  const blockH = lines.length * lineH + pad * 2;

  if (align === 'center') {
    const blockW = Math.min(maxWidth + pad * 2, SIZE - 60);
    const bx = (SIZE - blockW) / 2;
    ctx.fillStyle = bgColor;
    roundRect(ctx, bx, y - pad, blockW, blockH, 12);
    ctx.fill();
    ctx.fillStyle = HC.white;
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillText(line, SIZE / 2, y + pad + i * lineH);
    });
  } else {
    let maxLineW = 0;
    lines.forEach(l => { maxLineW = Math.max(maxLineW, ctx.measureText(l).width); });
    const blockW = maxLineW + pad * 3;
    ctx.fillStyle = bgColor;
    roundRect(ctx, 30, y - pad, blockW, blockH, 8);
    ctx.fill();
    ctx.fillStyle = HC.orange;
    ctx.fillRect(30, y - pad, 6, blockH);
    ctx.fillStyle = HC.white;
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillText(line, 56, y + pad + i * lineH);
    });
  }
  ctx.textAlign = 'left';
  return { bottomY: y + blockH };
}
