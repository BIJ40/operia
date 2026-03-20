/**
 * Template : awareness_card — Créa journée sensibilisation 1080x1080
 * V5 — STRICT layout: logo top-left, universe top-right, CTA centered, footer always.
 * NO parasitic elements (no topic badge, no date badge, no accent bar).
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawHCFooterBar, drawHCLogo,
  drawGradientBg, drawCinematicOverlay, drawHookText, drawSubText,
  drawCTAButton, drawUniversePill,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-house-icon.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawAwarenessCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
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

  // ─── ZONE 1: Top bar — Logo left, Universe right ───
  await drawHCLogo(ctx, logoSrc, 'top-left');
  drawUniversePill(ctx, theme, 35);

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

  // ─── ZONE 4: CTA — CENTRÉ horizontalement ───
  drawCTAButton(ctx, cta, { align: 'center' });

  // ─── ZONE 5: Footer — TOUJOURS présent ───
  drawHCFooterBar(ctx, theme);
}
