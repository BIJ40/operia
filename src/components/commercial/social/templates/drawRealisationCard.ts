/**
 * Template : realisation_card — Créa publicitaire réalisation 1080x1080
 * V5 — STRICT layout: logo top-left, universe top-right, CTA centered, footer always.
 * NO parasitic elements (no accent bar).
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawUniverseOverlay, drawHCFooterBar, drawHCLogo,
  drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-house-icon.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawRealisationCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
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

  // ─── ZONE 2: Photo plein cadre ───
  try {
    const img = await loadImage(payload.mediaUrl);
    drawCover(ctx, img, 0, 0, SIZE, SIZE);
  } catch {
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  drawUniverseOverlay(ctx, theme);
  drawCinematicOverlay(ctx, 0.75);

  // ─── ZONE 1: Top bar — Logo left, Universe right ───
  await drawHCLogo(ctx, logoSrc, 'top-left');
  drawUniversePill(ctx, theme, 35);

  // ─── ZONE 3: Hook + subtext ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Réalisation', {
    y: ZONES.TEXT_START,
    align: 'left',
  });

  if (payload.caption) {
    drawSubText(ctx, payload.caption, {
      y: hookBottom + 14,
      align: 'left',
    });
  }

  // ─── ZONE 4: CTA — CENTRÉ horizontalement ───
  drawCTAButton(ctx, cta, { align: 'center' });

  // ─── ZONE 5: Footer — TOUJOURS présent ───
  drawHCFooterBar(ctx, theme);
}
