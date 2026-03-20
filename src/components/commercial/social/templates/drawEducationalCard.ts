/**
 * Template : educational_card — Créa pédagogique 1080×1080
 * Style : chiffre clé / schéma simple / comparaison
 * Couleur dominante : ambre (#F59E0B)
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawHCFooterBar, drawHCLogo,
  drawGradientBg, drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill,
} from './canvasHelpers';
import { getLogoSrc, getPictoSrc } from './templateAssets';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawEducationalCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe, payload.topicType);
  const cta = payload.cta || 'En savoir plus';

  // ─── Background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.75);
    } catch {
      drawGradientBg(ctx, '#1C1917', '#0C0A09');
    }
  } else {
    drawGradientBg(ctx, '#1C1917', '#0C0A09');
  }

  // Amber accent strip on left
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, 0, 8, SIZE);

  // Subtle amber glow top-right
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(SIZE - 80, 120, 280, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ─── Top bar ───
  await drawHCLogo(ctx, getLogoSrc(), 'top-left');
  
  // Badge "Le saviez-vous ?"
  const badgeText = '💡 Le saviez-vous ?';
  ctx.font = `bold 26px ${HC.FONT}`;
  const badgeW = ctx.measureText(badgeText).width + 32;
  const badgeX = SIZE - badgeW - 40;
  const badgeY = 38;
  ctx.fillStyle = '#F59E0B';
  const badgeR = 16;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, 44, badgeR);
  ctx.fill();
  ctx.fillStyle = '#1C1917';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 31);
  ctx.textAlign = 'left';

  // ─── Hook (chiffre / prise de conscience) ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Le saviez-vous ?', {
    y: ZONES.TEXT_START,
    align: 'left',
  });

  // ─── Subtext (explication simple) ───
  if (payload.caption) {
    drawSubText(ctx, payload.caption, {
      y: hookBottom + 14,
      align: 'center',
    });
  }

  // ─── CTA ───
  drawCTAButton(ctx, cta, { align: 'center' });

  // ─── Footer ───
  await drawHCFooterBar(ctx, theme, undefined, getPictoSrc(payload.universe));
}
