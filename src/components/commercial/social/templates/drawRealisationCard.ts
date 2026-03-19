/**
 * Template : realisation_card — Créa publicitaire réalisation 1080x1080
 * V3 — Ad-Ready : hook gros, CTA, overlay cinématique, prêt à poster.
 */
import {
  SIZE, loadImage, drawCover, truncateText,
  getTheme, HC,
  drawUniverseOverlay, drawHCFooterBar, drawHCLogo,
  drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill, drawAccentBar,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

/**
 * RÈGLE : Ce template nécessite OBLIGATOIREMENT une vraie photo (mediaUrl).
 */
export async function drawRealisationCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const hook = truncateText(payload.hook || payload.title || 'Réalisation', 50);
  const subText = truncateText(payload.caption || '', 80);
  const cta = payload.cta || 'Demandez un devis gratuit';

  // GUARD: Ce template exige une vraie photo
  if (!payload.mediaUrl) {
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = HC.orange;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ PHOTO RÉELLE REQUISE', SIZE / 2, SIZE / 2 - 20);
    ctx.fillStyle = HC.white;
    ctx.font = '24px sans-serif';
    ctx.fillText('Ce template nécessite une photo APRÈS', SIZE / 2, SIZE / 2 + 30);
    drawHCFooterBar(ctx, theme);
    return;
  }

  // ─── 1. FOND : Photo plein cadre ───
  try {
    const img = await loadImage(payload.mediaUrl);
    drawCover(ctx, img, 0, 0, SIZE, SIZE);
  } catch {
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // ─── 2. Universe overlay tint ───
  drawUniverseOverlay(ctx, theme);

  // ─── 3. OVERLAY CINÉMATIQUE : lisibilité garantie ───
  drawCinematicOverlay(ctx, 0.75);

  // ─── 4. Accent bar gauche (couleur métier) ───
  drawAccentBar(ctx, theme, 10);

  // ─── 5. Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── 6. Universe pill top-right ───
  drawUniversePill(ctx, theme, 35);

  // ─── 7. HOOK TEXT : accroche publicitaire GROS ───
  const { bottomY: hookBottom } = drawHookText(ctx, hook, {
    y: SIZE - 380,
    fontSize: 64,
    maxWidth: SIZE - 160,
    align: 'left',
  });

  // ─── 8. SOUS-TEXTE ───
  if (subText) {
    drawSubText(ctx, subText, {
      y: hookBottom + 16,
      fontSize: 28,
      maxWidth: SIZE - 180,
      align: 'left',
    });
  }

  // ─── 9. CTA BUTTON ───
  drawCTAButton(ctx, cta, { y: SIZE - 160, align: 'left' });

  // ─── 10. FOOTER SIGNATURE ───
  drawHCFooterBar(ctx, theme);
}
