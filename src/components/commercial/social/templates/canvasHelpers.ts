/**
 * Canvas helpers réutilisables pour les templates social visuels.
 * Extraits et étendus depuis BeforeAfterCardCanvas.
 */

export const SIZE = 1080;

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
  if (imgRatio > boxRatio) {
    sw = img.naturalHeight * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / boxRatio;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgRatio > boxRatio) {
    dw = w; dh = w / imgRatio; dx = x; dy = y + (h - dh) / 2;
  } else {
    dh = h; dw = h * imgRatio; dx = x + (w - dw) / 2; dy = y;
  }
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

/** Tronque le texte à maxLen caractères avec ellipsis */
export function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

/** Wrap text sur plusieurs lignes selon une largeur max */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
  return lines;
}

/** Dessine un fond dégradé vertical */
export function drawGradientBg(ctx: CanvasRenderingContext2D, color1: string, color2: string) {
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

export interface ServiceTheme {
  label: string;
  bg: string;
  accent: string;
  labelColor: string;
}

export const SERVICE_THEMES: Record<string, ServiceTheme> = {
  plomberie:   { label: 'Plomberie',           bg: '#2D8BC9', accent: '#136AAD', labelColor: '#D6EEFF' },
  electricite: { label: 'Électricité',         bg: '#F8A73C', accent: '#F68A30', labelColor: '#FFF4D6' },
  serrurerie:  { label: 'Serrurerie',          bg: '#E22673', accent: '#DF0E61', labelColor: '#FFD6E8' },
  menuiserie:  { label: 'Menuiserie',          bg: '#EF8531', accent: '#E86424', labelColor: '#FFE4D6' },
  vitrerie:    { label: 'Vitrerie',            bg: '#90C14E', accent: '#62B144', labelColor: '#E4F2D6' },
  volets:      { label: 'Volets roulants',     bg: '#A23189', accent: '#912982', labelColor: '#F0D6EC' },
  pmr:         { label: 'Adaptation logement', bg: '#3C64A2', accent: '#2650A6', labelColor: '#D6DFEF' },
  renovation:  { label: 'Rénovation',          bg: '#B79D84', accent: '#957E6E', labelColor: '#EDE5DE' },
  general:     { label: 'Multi-services',      bg: '#37474F', accent: '#263238', labelColor: '#CFD8DC' },
};

export function getTheme(universe?: string | null): ServiceTheme {
  return SERVICE_THEMES[universe || 'general'] || SERVICE_THEMES.general;
}
