/**
 * Template : brand_card — Réassurance marque 1080x1080
 */
import { SIZE, truncateText, wrapText, getTheme, drawGradientBg, loadImage, drawContain } from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawBrandCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Help Confort', 80);
  const caption = truncateText(payload.caption || '', 300);

  // Background gradient
  drawGradientBg(ctx, theme.bg, theme.accent);

  // Subtle pattern — diagonal lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = -SIZE; i < SIZE * 2; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
  }

  // Banner centered top
  try {
    const imgBanner = await loadImage(bannerSrc);
    const bW = 600;
    const bH = Math.round(bW / (imgBanner.naturalWidth / imgBanner.naturalHeight));
    const bX = (SIZE - bW) / 2;
    const bY = 80;
    // White backing
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bX - 10, bY - 10, bW + 20, bH + 20);
    drawContain(ctx, imgBanner, bX, bY, bW, bH);
  } catch { /* banner optional */ }

  // Large quote / message
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 50px sans-serif';
  ctx.textAlign = 'center';
  const titleLines = wrapText(ctx, title, SIZE - 160);
  let y = 420;
  titleLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y);
    y += 62;
  });

  // Caption
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const capLines = wrapText(ctx, caption, SIZE - 160);
  y += 16;
  capLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y);
    y += 36;
  });

  // Service pill at bottom
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, SIZE - 90, SIZE, 90);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Votre partenaire habitat de confiance', SIZE / 2, SIZE - 40);
}
