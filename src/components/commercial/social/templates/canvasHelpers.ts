/**
 * Canvas helpers réutilisables pour les templates social visuels.
 * V2 — Branding Help Confort fort + univers métier.
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
  overlayTint: string; // overlay color for universe branding
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
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && currentLine) { lines.push(currentLine); currentLine = word; }
    else { currentLine = test; }
  }
  if (currentLine) lines.push(currentLine);
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
  // Blue HC bar
  ctx.fillStyle = HC.blue;
  ctx.fillRect(0, y, SIZE, height);
  // Accent line top
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, y, SIZE, 4);
  // Text
  ctx.fillStyle = HC.white;
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Help Confort — Dépannage & Travaux', 50, y + height / 2 + 9);
  // Universe label right
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(theme.label, SIZE - 50, y + height / 2 + 8);
}

/** Logo HC en haut (bannière) */
export async function drawHCLogo(ctx: CanvasRenderingContext2D, logoSrc: string, position: 'top-left' | 'top-center' = 'top-left') {
  try {
    const img = await loadImage(logoSrc);
    const maxH = 70;
    const ratio = img.naturalWidth / img.naturalHeight;
    const h = maxH;
    const w = h * ratio;

    if (position === 'top-center') {
      const bgW = w + 30;
      const bgH = h + 20;
      const bx = (SIZE - bgW) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      roundRect(ctx, bx, 20, bgW, bgH, 10);
      ctx.fill();
      drawContain(ctx, img, bx + 15, 30, w, h);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      roundRect(ctx, 30, 25, w + 24, h + 16, 10);
      ctx.fill();
      drawContain(ctx, img, 42, 33, w, h);
    }
  } catch { /* logo optional but logged */ }
}

/** Bloc titre HC style — fond bleu/accent + texte blanc uppercase */
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

  // Background block
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
    // Measure widest line for block width
    let maxLineW = 0;
    lines.forEach(l => { maxLineW = Math.max(maxLineW, ctx.measureText(l).width); });
    const blockW = maxLineW + pad * 3;
    ctx.fillStyle = bgColor;
    roundRect(ctx, 30, y - pad, blockW, blockH, 8);
    ctx.fill();
    // Orange accent left edge
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
