/**
 * Template : awareness_card — Journée de sensibilisation 1080x1080
 */
import { SIZE, truncateText, wrapText, getTheme, roundRect } from './canvasHelpers';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawAwarenessCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Journée thématique', 80);
  const caption = truncateText(payload.caption || '', 250);
  const date = payload.date || '';

  // Background — darker, editorial feel
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Accent stripe left
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, 16, SIZE);

  // Accent circle top-right
  ctx.fillStyle = theme.bg;
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(SIZE + 60, -60, 350, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Date badge
  if (date) {
    ctx.fillStyle = theme.bg;
    roundRect(ctx, 60, 60, ctx.measureText(date).width * 2.5 + 40, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(date, 80, 94);
  }

  // Large title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'left';
  const titleLines = wrapText(ctx, title, SIZE - 140);
  let y = 220;
  titleLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, 60, y);
    y += 68;
  });

  // Divider line
  y += 10;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(60, y, 120, 4);
  y += 40;

  // Caption
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '28px sans-serif';
  const capLines = wrapText(ctx, caption, SIZE - 140);
  capLines.slice(0, 6).forEach((line) => {
    ctx.fillText(line, 60, y);
    y += 38;
  });

  // Universe label
  ctx.fillStyle = theme.labelColor;
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(theme.label, 60, SIZE - 140);

  // Bottom bar
  const bottomY = SIZE - 80;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, bottomY, SIZE, 80);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Prévention & Habitat', 60, bottomY + 48);
  ctx.textAlign = 'right';
  ctx.fillText('Help Confort', SIZE - 60, bottomY + 48);
}
