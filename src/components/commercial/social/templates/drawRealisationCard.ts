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

/**
 * RÈGLE : Ce template nécessite OBLIGATOIREMENT une vraie photo (mediaUrl).
 * Si appelé sans photo, il affiche un message d'erreur — le templateResolver
 * ne devrait jamais router ici sans hasMedia=true.
 */
export async function drawRealisationCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Réalisation', 50);
  const caption = truncateText(payload.caption || '', 120);

  // GUARD: Ce template exige une vraie photo. Sans mediaUrl, on refuse.
  if (!payload.mediaUrl) {
    console.warn('[drawRealisationCard] Appelé sans mediaUrl — ce template requiert une vraie photo APRÈS.');
    // Render a clear error state rather than fake content
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = HC.orange;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ PHOTO RÉELLE REQUISE', SIZE / 2, SIZE / 2 - 20);
    ctx.fillStyle = HC.white;
    ctx.font = '24px sans-serif';
    ctx.fillText('Ce template nécessite une photo APRÈS', SIZE / 2, SIZE / 2 + 30);
    ctx.fillText('de la partie Réalisations', SIZE / 2, SIZE / 2 + 60);
    drawHCFooterBar(ctx, theme);
    return;
  }

  // ─── Full-bleed real photo ───
  try {
    const img = await loadImage(payload.mediaUrl);
    drawCover(ctx, img, 0, 0, SIZE, SIZE);
  } catch {
    // Photo failed to load — show error state
    ctx.fillStyle = HC.grayDark;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = HC.white;
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Photo introuvable', SIZE / 2, SIZE / 2);
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
