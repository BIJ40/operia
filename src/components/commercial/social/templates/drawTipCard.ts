/**
 * Template : tip_card — Créa publicitaire conseil saisonnier 1080x1080
 * V4 — Zone-based layout: no overflow, no collision.
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawGradientBg, drawHCFooterBar, drawHCLogo,
  drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill, drawTopicBadge, drawAccentBar,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawTipCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const cta = payload.cta || 'En savoir plus';

  // ─── ZONE 2: Background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.72);
    } catch {
      drawGradientBg(ctx, HC.grayDark, '#1A1A2E');
    }
  } else {
    drawGradientBg(ctx, HC.grayDark, '#1A1A2E');
    // Decorative accent shapes (only on solid bg)
    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.arc(SIZE - 100, 180, 280, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(100, SIZE - 200, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── ZONE 1: Top bar ───
  drawAccentBar(ctx, theme, 8);
  await drawHCLogo(ctx, logoSrc, 'top-left');
  drawTopicBadge(ctx, '💡 Conseil');
  drawUniversePill(ctx, theme, 35);

  // ─── ZONE 3: Hook + subtext ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Conseil', {
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
