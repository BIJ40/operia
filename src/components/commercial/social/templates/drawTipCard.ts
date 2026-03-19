/**
 * Template : tip_card — Créa publicitaire conseil saisonnier 1080x1080
 * V3 — Ad-Ready : hook gros, CTA, composition publicitaire.
 */
import {
  SIZE, truncateText, loadImage, drawCover,
  getTheme, HC,
  drawGradientBg, drawHCFooterBar, drawHCLogo,
  drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill, drawTopicBadge, drawAccentBar,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-house-icon.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawTipCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const hook = truncateText(payload.hook || payload.title || 'Conseil', 50);
  const subText = truncateText(payload.caption || '', 100);
  const cta = payload.cta || 'En savoir plus';

  // ─── 1. FOND : image IA ou gradient HC foncé ───
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

  // ─── 2. Accent bar gauche ───
  drawAccentBar(ctx, theme, 8);

  // ─── 3. Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── 4. Badge "CONSEIL" ───
  drawTopicBadge(ctx, '💡 Conseil', { x: 70, y: 130 });

  // ─── 5. Universe pill top-right ───
  drawUniversePill(ctx, theme, 35);

  // ─── 6. HOOK TEXT : accroche publicitaire ───
  const { bottomY: hookBottom } = drawHookText(ctx, hook, {
    y: SIZE - 420,
    fontSize: 62,
    maxWidth: SIZE - 160,
    align: 'left',
  });

  // ─── 7. SOUS-TEXTE ───
  if (subText) {
    drawSubText(ctx, subText, {
      y: hookBottom + 16,
      fontSize: 28,
      maxWidth: SIZE - 180,
      align: 'left',
    });
  }

  // ─── 8. CTA BUTTON ───
  drawCTAButton(ctx, cta, { y: SIZE - 160, align: 'left' });

  // ─── 9. FOOTER SIGNATURE ───
  drawHCFooterBar(ctx, theme);
}
