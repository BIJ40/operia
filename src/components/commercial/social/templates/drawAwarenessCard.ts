/**
 * Template : awareness_card — Créa journée sensibilisation 1080x1080
 * V3 — Ad-Ready : hook gros, date badge, CTA, prêt à poster.
 */
import {
  SIZE, truncateText, loadImage, drawCover,
  getTheme, HC, roundRect,
  drawHCFooterBar, drawHCLogo,
  drawGradientBg, drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawAccentBar, drawTopicBadge,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-house-icon.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawAwarenessCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const hook = truncateText(payload.hook || payload.title || 'Journée thématique', 50);
  const subText = truncateText(payload.caption || '', 100);
  const date = payload.date || '';
  const cta = payload.cta || 'Contactez-nous';

  // ─── 1. FOND : image IA ou editorial sombre ───
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

    // Decorative accent circle
    ctx.fillStyle = theme.bg;
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.arc(SIZE + 40, -40, 340, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── 2. Accent bar gauche ───
  drawAccentBar(ctx, theme, 10);

  // ─── 3. Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── 4. Badge "SENSIBILISATION" ───
  drawTopicBadge(ctx, '🎗️ Sensibilisation', { x: 70, y: 130 });

  // ─── 5. Date badge ───
  if (date) {
    ctx.font = 'bold 22px sans-serif';
    const dateW = ctx.measureText(date).width + 36;
    ctx.fillStyle = HC.orange;
    roundRect(ctx, 70, 185, dateW, 44, 22);
    ctx.fill();
    ctx.fillStyle = HC.grayDark;
    ctx.textAlign = 'left';
    ctx.fillText(date, 88, 214);
  }

  // ─── 6. HOOK TEXT ───
  const { bottomY: hookBottom } = drawHookText(ctx, hook, {
    y: SIZE - 400,
    fontSize: 60,
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

  // ─── 9. FOOTER ───
  drawHCFooterBar(ctx, theme);
}
