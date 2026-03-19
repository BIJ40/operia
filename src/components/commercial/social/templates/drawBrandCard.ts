/**
 * Template : brand_card — Créa branding / fallback 1080x1080
 * V4 — Zone-based layout: no overflow, no collision.
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawGradientBg, drawHCFooterBar, drawHCLogo,
  drawContain, drawHookText, drawSubText, drawCTAButton,
  drawCinematicOverlay, drawUniversePill, roundRect,
} from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawBrandCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const cta = payload.cta || 'Appelez-nous';

  // ─── ZONE 2: Background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.72);
    } catch {
      drawGradientBg(ctx, HC.blue, HC.blueDark);
    }
  } else {
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
  }

  // ─── ZONE 1: Top bar ───
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, 0, SIZE, 6);
  await drawHCLogo(ctx, logoSrc, 'top-left');
  drawUniversePill(ctx, theme, 35);

  // Banner image (only on solid bg, inside ZONE 2)
  if (!payload.mediaUrl) {
    try {
      const imgBanner = await loadImage(bannerSrc);
      const bW = 520;
      const bH = Math.round(bW / (imgBanner.naturalWidth / imgBanner.naturalHeight));
      const bX = (SIZE - bW) / 2;
      const bY = 140;
      ctx.fillStyle = HC.white;
      roundRect(ctx, bX - 8, bY - 8, bW + 16, bH + 16, 8);
      ctx.fill();
      drawContain(ctx, imgBanner, bX, bY, bW, bH);
    } catch { /* banner optional */ }
  }

  // ─── ZONE 3: Hook + subtext ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Help Confort', {
    y: ZONES.TEXT_START,
    align: 'left',
    color: HC.white,
  });

  if (payload.caption) {
    drawSubText(ctx, payload.caption, {
      y: hookBottom + 14,
      align: 'left',
      color: 'rgba(255,255,255,0.88)',
    });
  }

  // ─── ZONE 4: CTA ───
  drawCTAButton(ctx, cta, { align: 'left' });

  // ─── ZONE 5: Footer ───
  drawHCFooterBar(ctx, theme);
}
