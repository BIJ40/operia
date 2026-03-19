/**
 * Template : tip_card — Conseil saisonnier 1080x1080
 */
import { SIZE, truncateText, wrapText, getTheme, drawGradientBg, roundRect } from './canvasHelpers';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

const TIP_ICONS: Record<string, string> = {
  plomberie: '🔧', electricite: '⚡', serrurerie: '🔑',
  vitrerie: '🪟', menuiserie: '🪚', renovation: '🏠',
  volets: '🪟', pmr: '♿', general: '💡',
};

export async function drawTipCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Conseil', 80);
  const caption = truncateText(payload.caption || '', 300);
  const icon = TIP_ICONS[payload.universe || 'general'] || '💡';

  // Background
  drawGradientBg(ctx, theme.bg, theme.accent);

  // Decorative circle
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(SIZE - 150, 200, 300, 0, Math.PI * 2);
  ctx.fill();

  // Top label
  ctx.fillStyle = theme.labelColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONSEIL', 60, 80);

  // Service pill
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 200, 56, ctx.measureText(theme.label).width + 40, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px sans-serif';
  ctx.fillText(theme.label, 220, 80);

  // Large icon
  ctx.font = '160px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, SIZE / 2, 320);

  // Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  const titleLines = wrapText(ctx, title, SIZE - 140);
  let y = 440;
  titleLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y);
    y += 62;
  });

  // Caption
  ctx.font = '28px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const capLines = wrapText(ctx, caption, SIZE - 160);
  capLines.slice(0, 5).forEach((line) => {
    ctx.fillText(line, SIZE / 2, y + 20);
    y += 38;
  });

  // Bottom branding bar
  const bottomY = SIZE - 80;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, bottomY, SIZE, 80);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Help Confort — Dépannage & Travaux', SIZE / 2, bottomY + 50);
}
