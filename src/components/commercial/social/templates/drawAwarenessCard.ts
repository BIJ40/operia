/**
 * Template : awareness_card — Créa journée sensibilisation 1080x1080
 * V4 — Zone-based layout: no overflow, no collision.
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES, roundRect,
  drawHCFooterBar, drawHCLogo,
  drawGradientBg, drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawAccentBar, drawTopicBadge,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-house-icon.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawAwarenessCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const date = payload.date || '';
  const cta = payload.cta || 'Contactez-nous';

  // ─── ZONE 2: Background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.72);
    } catch {
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
  } else {
    drawGradientBg(ctx, '#1A1A2E', '#0D0D1A');
    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.arc(SIZE + 40, -40, 340, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── ZONE 1: Top bar ───
  drawAccentBar(ctx, theme, 10);
  await drawHCLogo(ctx, logoSrc, 'top-left');
  drawTopicBadge(ctx, '🎗️ Sensibilisation');

  // Date badge (inside ZONE 1 extended)
  if (date) {
    ctx.font = 'bold 22px sans-serif';
    const dateW = ctx.measureText(date).width + 36;
    ctx.fillStyle = HC.orange;
    roundRect(ctx, ZONES.MARGIN_X, 185, dateW, 44, 22);
    ctx.fill();
    ctx.fillStyle = HC.grayDark;
    ctx.textAlign = 'left';
    ctx.fillText(date, ZONES.MARGIN_X + 18, 214);
  }

  // ─── ZONE 3: Hook + subtext ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Journée thématique', {
    y: ZONES.TEXT_START,
    align: 'left',
  });

  if (payload.caption) {
    drawSubText(ctx, payload.caption, {
      y: hookBottom + 14,
      align: 'left',
    });
  }

  // ─── ZONE 4: CTA ───
  drawCTAButton(ctx, cta, { align: 'left' });

  // ─── ZONE 5: Footer ───
  drawHCFooterBar(ctx, theme);
}
