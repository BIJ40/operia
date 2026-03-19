/**
 * Template : realisation_card — Visuel réalisation métier 1080x1080
 * V2 — Branding HC fort, overlay univers, logo, bandeau signature.
 */
import {
  SIZE, loadImage, drawCover, drawContain, roundRect, truncateText, wrapText,
  getTheme, HC, drawUniverseOverlay, drawHCFooterBar, drawHCLogo,
  drawHCTitleBlock, drawBottomGradient,
} from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawRealisationCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Réalisation', 50);
  const caption = truncateText(payload.caption || '', 120);

  // ─── Full-bleed image or branded background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
    } catch { /* fallback below */ }
  }

  // If no media, draw branded gradient
  if (!payload.mediaUrl) {
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Decorative circle
    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(SIZE * 0.7, SIZE * 0.35, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Placeholder icon
    ctx.font = 'bold 140px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillText('🔧', SIZE / 2, SIZE * 0.45);
  }

  // ─── Universe overlay tint ───
  drawUniverseOverlay(ctx, theme);

  // ─── Bottom gradient for readability ───
  drawBottomGradient(ctx, 500);

  // ─── Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── Universe pill top-right ───
  ctx.font = 'bold 20px sans-serif';
  const pillText = theme.label.toUpperCase();
  const pillW = ctx.measureText(pillText).width + 36;
  ctx.fillStyle = theme.bg;
  roundRect(ctx, SIZE - pillW - 40, 35, pillW, 40, 20);
  ctx.fill();
  ctx.fillStyle = HC.white;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, SIZE - pillW / 2 - 40, 62);

  // ─── Title block ───
  drawHCTitleBlock(ctx, title, { y: SIZE - 320, align: 'left', bgColor: HC.blue, fontSize: 48 });

  // ─── Caption ───
  if (caption) {
    ctx.font = '26px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'left';
    const capLines = wrapText(ctx, caption, SIZE - 120);
    let cy = SIZE - 170;
    capLines.slice(0, 2).forEach((line) => {
      ctx.fillText(line, 50, cy);
      cy += 34;
    });
  }

  // ─── HC Footer Bar ───
  drawHCFooterBar(ctx, theme);
}
