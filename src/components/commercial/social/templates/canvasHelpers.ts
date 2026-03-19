/**
 * Canvas helpers — V3 "Ad-Ready" Social Media Creatives
 * Composants réutilisables pour visuels publicitaires prêts à poster.
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

// ─── Image helpers ──────────────────────────────────────────
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

export function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  // Cut at last space before maxLen to avoid mid-word truncation
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.5 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

/**
 * Word-wrap text to fit within maxWidth.
 * Optional maxLines param: if set, truncates the last visible line with "…" instead of cutting mid-word.
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

  // If maxLines specified and text overflows, add ellipsis to last visible line
  if (maxLines && lines.length > maxLines) {
    const truncatedLines = lines.slice(0, maxLines);
    let lastLine = truncatedLines[maxLines - 1];
    // Add ellipsis, trimming words until it fits
    while (ctx.measureText(lastLine + '…').width > maxWidth && lastLine.includes(' ')) {
      lastLine = lastLine.slice(0, lastLine.lastIndexOf(' '));
    }
    truncatedLines[maxLines - 1] = lastLine + '…';
    return truncatedLines;
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

// ─── HC Branded Components ──────────────────────────────────

/** Overlay teinté univers sur toute l'image */
export function drawUniverseOverlay(ctx: CanvasRenderingContext2D, theme: ServiceTheme, x = 0, y = 0, w = SIZE, h = SIZE) {
  ctx.fillStyle = theme.overlayTint;
  ctx.fillRect(x, y, w, h);
}

/** Bandeau signature bas "Help Confort – Dépannage & Travaux" */
export function drawHCFooterBar(ctx: CanvasRenderingContext2D, theme: ServiceTheme, height = 90) {
  const y = SIZE - height;
  ctx.fillStyle = HC.blue;
  ctx.fillRect(0, y, SIZE, height);
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, y, SIZE, 4);
  ctx.fillStyle = HC.white;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HelpConfort — DEPAN40', 50, y + height / 2 + 9);
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(theme.label, SIZE - 50, y + height / 2 + 8);
}

/** Logo HC en haut — logo complet Help Confort */
export async function drawHCLogo(ctx: CanvasRenderingContext2D, logoSrc: string, position: 'top-left' | 'top-center' = 'top-left') {
  const logoH = 52;
  const padX = 12;
  const padY = 8;

  try {
    const img = await loadImage(logoSrc);
    const logoRatio = img.naturalWidth / img.naturalHeight;
    const logoW = logoH * logoRatio;
    const bgW = logoW + padX * 2;
    const bgH = logoH + padY * 2;

    const x = position === 'top-center' ? (SIZE - bgW) / 2 : 30;
    const y = 25;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, x, y, bgW, bgH, 10);
    ctx.fill();

    drawContain(ctx, img, x + padX, y + padY, logoW, logoH);
  } catch {
    const bgW = 180;
    const bgH = logoH + padY * 2;
    const x = position === 'top-center' ? (SIZE - bgW) / 2 : 30;
    const y = 25;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(ctx, x, y, bgW, bgH, 10);
    ctx.fill();
    ctx.fillStyle = HC.blue;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Help Confort', x + padX, y + bgH / 2 + 8);
  }
  ctx.textAlign = 'left';
}

/** Bloc titre HC style */
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
  const lines = wrapText(ctx, upperTitle, maxWidth);
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
    lines.slice(0, 3).forEach((line, i) => {
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
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, 56, y + pad + i * lineH);
    });
  }
  ctx.textAlign = 'left';
  return { bottomY: y + blockH };
}

/** Gradient overlay bottom (for readability over images) */
export function drawBottomGradient(ctx: CanvasRenderingContext2D, height = 400, color = 'rgba(0,0,0,0.6)') {
  const grad = ctx.createLinearGradient(0, SIZE - height, 0, SIZE);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, SIZE - height, SIZE, height);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// V3 — AD-READY CREATIVE COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * HOOK TEXT — Le texte d'accroche GROS et CONTRASTÉ.
 * 3 à 6 mots max, majuscules, très lisible.
 * Rend le texte avec ombre portée pour contraste garanti.
 */
export function drawHookText(
  ctx: CanvasRenderingContext2D,
  hook: string,
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
    y = 500,
    fontSize = 72,
    maxWidth = SIZE - 140,
    color = HC.white,
    align = 'left',
    shadowColor = 'rgba(0,0,0,0.6)',
  } = options;

  const text = hook.toUpperCase();
  ctx.font = `900 ${fontSize}px sans-serif`;
  ctx.textAlign = align;
  const lines = wrapText(ctx, text, maxWidth, 3);
  const lineH = fontSize * 1.15;

  const xPos = align === 'center' ? SIZE / 2 : 70;

  // Draw text shadow for contrast
  lines.forEach((line, i) => {
    const ly = y + i * lineH;
    ctx.fillStyle = shadowColor;
    ctx.fillText(line, xPos + 3, ly + 3);
    ctx.fillStyle = color;
    ctx.fillText(line, xPos, ly);
  });

  ctx.textAlign = 'left';
  return { bottomY: y + lines.length * lineH };
}

/**
 * SOUS-TEXTE — Texte secondaire plus petit sous le hook.
 * Renforce le message. 1-2 lignes max.
 */
export function drawSubText(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: {
    y?: number;
    fontSize?: number;
    maxWidth?: number;
    color?: string;
    align?: 'left' | 'center';
  } = {}
) {
  const {
    y = 700,
    fontSize = 30,
    maxWidth = SIZE - 160,
    color = 'rgba(255,255,255,0.92)',
    align = 'left',
  } = options;

  ctx.font = `500 ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const lines = wrapText(ctx, text, maxWidth, 2);
  const lineH = fontSize * 1.35;
  const xPos = align === 'center' ? SIZE / 2 : 70;

  lines.forEach((line, i) => {
    ctx.fillText(line, xPos, y + i * lineH);
  });

  ctx.textAlign = 'left';
  return { bottomY: y + lines.length * lineH };
}

/**
 * CTA BUTTON — Bouton d'appel à l'action.
 * Visible, contrasté, avec coin arrondi.
 */
export function drawCTAButton(
  ctx: CanvasRenderingContext2D,
  cta: string,
  options: {
    y?: number;
    align?: 'left' | 'center';
    bgColor?: string;
    textColor?: string;
    fontSize?: number;
  } = {}
) {
  if (!cta) return;

  const {
    y = 830,
    align = 'left',
    bgColor = HC.orange,
    textColor = HC.grayDark,
    fontSize = 26,
  } = options;

  const text = cta.toUpperCase();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const textW = ctx.measureText(text).width;
  const padX = 32;
  const padY = 16;
  const btnW = textW + padX * 2;
  const btnH = fontSize + padY * 2;

  const x = align === 'center' ? (SIZE - btnW) / 2 : 70;

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

/**
 * CINEMATIC DARK OVERLAY — Overlay fort pour lisibilité publicitaire.
 * Gradient du haut ET du bas, laissant le centre plus visible.
 */
export function drawCinematicOverlay(ctx: CanvasRenderingContext2D, strength = 0.7) {
  // Bottom gradient (strongest — text area)
  const gradBot = ctx.createLinearGradient(0, SIZE * 0.3, 0, SIZE);
  gradBot.addColorStop(0, 'rgba(0,0,0,0)');
  gradBot.addColorStop(0.3, `rgba(0,0,0,${strength * 0.3})`);
  gradBot.addColorStop(0.6, `rgba(0,0,0,${strength * 0.6})`);
  gradBot.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = gradBot;
  ctx.fillRect(0, SIZE * 0.3, SIZE, SIZE * 0.7);

  // Top gradient (subtle — logo area)
  const gradTop = ctx.createLinearGradient(0, 0, 0, SIZE * 0.25);
  gradTop.addColorStop(0, `rgba(0,0,0,${strength * 0.5})`);
  gradTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, SIZE, SIZE * 0.25);
}

/**
 * UNIVERSE ACCENT BAR — Barre colorée verticale à gauche (accent métier).
 */
export function drawAccentBar(ctx: CanvasRenderingContext2D, theme: ServiceTheme, width = 8) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, SIZE);
}

/**
 * UNIVERSE PILL — Badge univers discret en haut à droite.
 */
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

/**
 * TOPIC BADGE — Badge "CONSEIL" / "SENSIBILISATION" / etc.
 */
export function drawTopicBadge(
  ctx: CanvasRenderingContext2D,
  label: string,
  options: { x?: number; y?: number; bgColor?: string; textColor?: string } = {}
) {
  const { x = 70, y = 130, bgColor = HC.orange, textColor = HC.grayDark } = options;
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
