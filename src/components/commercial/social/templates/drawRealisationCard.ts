/**
 * Template : realisation_card — Visuel réalisation métier 1080x1080
 */
import { SIZE, loadImage, drawCover, drawContain, roundRect, truncateText, wrapText, getTheme, drawGradientBg } from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawRealisationCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Réalisation', 60);
  const caption = truncateText(payload.caption || '', 160);

  // Background
  drawGradientBg(ctx, theme.bg, theme.accent);

  // Banner top
  try {
    const imgBanner = await loadImage(bannerSrc);
    const bannerPad = 12;
    const bannerW = SIZE - bannerPad * 2;
    const bannerH = Math.round(bannerW / (imgBanner.naturalWidth / imgBanner.naturalHeight));
    const topH = Math.min(bannerH + bannerPad * 2, 220);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bannerPad, bannerPad, bannerW, topH - bannerPad * 2);
    drawContain(ctx, imgBanner, bannerPad, bannerPad, bannerW, topH - bannerPad * 2);
  } catch { /* banner optional */ }

  // Main image if available
  const photoY = 240;
  const photoH = 520;
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      ctx.save();
      roundRect(ctx, 40, photoY, SIZE - 80, photoH, 20);
      ctx.clip();
      drawCover(ctx, img, 40, photoY, SIZE - 80, photoH);
      ctx.restore();

      // Overlay gradient bottom
      const grad = ctx.createLinearGradient(0, photoY + photoH - 140, 0, photoY + photoH);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.save();
      roundRect(ctx, 40, photoY, SIZE - 80, photoH, 20);
      ctx.clip();
      ctx.fillRect(40, photoY + photoH - 140, SIZE - 80, 140);
      ctx.restore();
    } catch { /* proceed without image */ }
  } else {
    // No image — large decorative element
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 40, photoY, SIZE - 80, photoH, 20);
    ctx.fill();

    // Placeholder icon
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔧', SIZE / 2, photoY + photoH / 2 + 40);
  }

  // Title bar
  const titleY = 790;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'left';
  const titleLines = wrapText(ctx, title, SIZE - 100);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 50, titleY + i * 52);
  });

  // Caption
  ctx.font = '26px sans-serif';
  ctx.fillStyle = theme.labelColor;
  const capLines = wrapText(ctx, caption, SIZE - 100);
  capLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, 50, titleY + titleLines.length * 52 + 10 + i * 34);
  });

  // Bottom accent bar
  const bottomY = SIZE - 80;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, bottomY, SIZE, 80);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(theme.label, 50, bottomY + 50);
  ctx.textAlign = 'right';
  ctx.font = '22px sans-serif';
  ctx.fillStyle = theme.labelColor;
  ctx.fillText('Help Confort', SIZE - 50, bottomY + 50);
}
