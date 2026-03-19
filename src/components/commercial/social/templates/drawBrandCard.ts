/**
 * Template : brand_card — Créa branding / fallback 1080x1080
 * V3 — Ad-Ready : hook gros centré, branding fort, prêt à poster.
 */
import {
  SIZE, truncateText, loadImage, drawCover,
  getTheme, HC, roundRect,
  drawGradientBg, drawHCFooterBar, drawHCLogo,
  drawContain, drawHookText, drawSubText, drawCTAButton,
  drawCinematicOverlay, drawUniversePill,
} from './canvasHelpers';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawBrandCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const hook = truncateText(payload.hook || payload.title || 'Help Confort', 50);
  const subText = truncateText(payload.caption || '', 100);
  const cta = payload.cta || 'Appelez-nous';

  // ─── 1. FOND ───
  if (payload.mediaUrl) {
    // Si une image IA est disponible, l'utiliser en fond
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.72);
    } catch {
      drawGradientBg(ctx, HC.blue, HC.blueDark);
    }
  } else {
    // Gradient HC fort
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

  // ─── 2. Orange accent bar top ───
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, 0, SIZE, 6);

  // ─── 3. Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── 3b. Universe pill top-right (if applicable) ───
  drawUniversePill(ctx, theme, 35);

  // ─── 4. Banner (only on solid bg, skip on image bg) ───
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

  // ─── 5. HOOK TEXT — accroche GROS centré ───
  const hookY = payload.mediaUrl ? SIZE - 400 : 460;
  const { bottomY: hookBottom } = drawHookText(ctx, hook, {
    y: hookY,
    fontSize: 60,
    maxWidth: SIZE - 160,
    align: 'left',
    color: HC.white,
  });

  // ─── 6. SOUS-TEXTE ───
  if (subText) {
    drawSubText(ctx, subText, {
      y: hookBottom + 20,
      fontSize: 28,
      maxWidth: SIZE - 200,
      align: 'left',
      color: 'rgba(255,255,255,0.88)',
    });
  }

  // ─── 7. CTA BUTTON centré ───
  drawCTAButton(ctx, cta, { y: SIZE - 170, align: 'center' });

  // ─── 8. FOOTER ───
  drawHCFooterBar(ctx, theme);
}
