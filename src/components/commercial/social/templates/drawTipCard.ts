/**
 * Template : tip_card — Conseil saisonnier 1080x1080
 * V2 — Branding HC fort, overlay univers, logo, bandeau signature.
 */
import {
  SIZE, truncateText, wrapText, getTheme, HC, roundRect,
  drawGradientBg, drawUniverseOverlay, drawHCFooterBar, drawHCLogo,
  drawHCTitleBlock,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

const TIP_ICONS: Record<string, string> = {
  plomberie: '🔧', electricite: '⚡', serrurerie: '🔑',
  vitrerie: '🪟', menuiserie: '🪚', renovation: '🏠',
  volets: '🪟', pmr: '♿', general: '💡',
};

export async function drawTipCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Conseil', 60);
  const caption = truncateText(payload.caption || '', 250);
  const icon = TIP_ICONS[payload.universe || 'general'] || '💡';

  // ─── Background: HC dark with universe accent ───
  drawGradientBg(ctx, HC.grayDark, '#1A1A2E');

  // Decorative accent shapes
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

  // Blue HC accent stripe left
  ctx.fillStyle = HC.blue;
  ctx.fillRect(0, 0, 8, SIZE);

  // ─── Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── "CONSEIL" label top ───
  ctx.fillStyle = HC.orange;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONSEIL', 50, 130);
  // Orange underline
  ctx.fillRect(50, 138, 90, 3);

  // ─── Universe pill ───
  ctx.fillStyle = theme.bg;
  const pillText = theme.label.toUpperCase();
  ctx.font = 'bold 18px sans-serif';
  const pillW = ctx.measureText(pillText).width + 32;
  roundRect(ctx, 160, 112, pillW, 34, 17);
  ctx.fill();
  ctx.fillStyle = HC.white;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, 160 + pillW / 2, 135);

  // ─── Large icon ───
  ctx.font = '140px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, SIZE / 2, 340);

  // ─── Title block HC style ───
  drawHCTitleBlock(ctx, title, { y: 420, align: 'center', bgColor: HC.blue, fontSize: 46 });

  // ─── Caption ───
  ctx.font = '26px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  const capLines = wrapText(ctx, caption, SIZE - 160);
  let y = 620;
  capLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y);
    y += 36;
  });

  // ─── HC Footer Bar ───
  drawHCFooterBar(ctx, theme);
}
