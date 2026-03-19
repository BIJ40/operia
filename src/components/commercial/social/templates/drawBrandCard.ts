/**
 * Template : brand_card — Réassurance marque 1080x1080
 * V2 — Branding HC fort, overlay univers, logo, bandeau signature.
 */
import {
  SIZE, truncateText, wrapText, getTheme, HC, roundRect,
  drawGradientBg, drawUniverseOverlay, drawHCFooterBar, drawHCLogo,
  drawHCTitleBlock, loadImage, drawContain,
} from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawBrandCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Help Confort', 70);
  const caption = truncateText(payload.caption || '', 250);

  // ─── Background gradient HC ───
  drawGradientBg(ctx, HC.blue, HC.blueDark);

  // Subtle diagonal pattern
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = -SIZE; i < SIZE * 2; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + SIZE, SIZE);
    ctx.stroke();
  }

  // ─── Orange accent bar top ───
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, 0, SIZE, 6);

  // ─── Logo HC top-center ───
  await drawHCLogo(ctx, logoSrc, 'top-center');

  // ─── Banner centered ───
  try {
    const imgBanner = await loadImage(bannerSrc);
    const bW = 560;
    const bH = Math.round(bW / (imgBanner.naturalWidth / imgBanner.naturalHeight));
    const bX = (SIZE - bW) / 2;
    const bY = 130;
    ctx.fillStyle = HC.white;
    roundRect(ctx, bX - 8, bY - 8, bW + 16, bH + 16, 8);
    ctx.fill();
    drawContain(ctx, imgBanner, bX, bY, bW, bH);
  } catch { /* banner optional */ }

  // ─── Title block HC style ───
  drawHCTitleBlock(ctx, title, { y: 420, align: 'center', bgColor: 'rgba(0,0,0,0.35)', fontSize: 48, maxWidth: SIZE - 140 });

  // ─── Caption ───
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.textAlign = 'center';
  const capLines = wrapText(ctx, caption, SIZE - 160);
  let y = 600;
  capLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y);
    y += 36;
  });

  // ─── HC Footer Bar ───
  drawHCFooterBar(ctx, theme);
}
