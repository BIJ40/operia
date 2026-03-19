/**
 * Template : awareness_card — Journée de sensibilisation 1080x1080
 * V2 — Branding HC fort, overlay univers, logo, bandeau signature.
 */
import {
  SIZE, truncateText, wrapText, getTheme, HC, roundRect,
  drawHCFooterBar, drawHCLogo, drawHCTitleBlock,
} from './canvasHelpers';
import logoSrc from '@/assets/help-confort-services-logo.png';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

export async function drawAwarenessCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe);
  const title = truncateText(payload.title || 'Journée thématique', 70);
  const caption = truncateText(payload.caption || '', 220);
  const date = payload.date || '';

  // ─── Background: dark editorial + HC accent ───
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Blue HC accent stripe left
  ctx.fillStyle = HC.blue;
  ctx.fillRect(0, 0, 10, SIZE);

  // Decorative accent circle top-right
  ctx.fillStyle = theme.bg;
  ctx.globalAlpha = 0.10;
  ctx.beginPath();
  ctx.arc(SIZE + 40, -40, 340, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Orange accent dots
  ctx.fillStyle = HC.orange;
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(SIZE - 80 - i * 60, SIZE - 180, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ─── Logo HC top-left ───
  await drawHCLogo(ctx, logoSrc, 'top-left');

  // ─── Date badge ───
  if (date) {
    ctx.font = 'bold 22px sans-serif';
    const dateW = ctx.measureText(date).width + 36;
    ctx.fillStyle = HC.orange;
    roundRect(ctx, 50, 120, dateW, 44, 22);
    ctx.fill();
    ctx.fillStyle = HC.grayDark;
    ctx.textAlign = 'left';
    ctx.fillText(date, 68, 149);
  }

  // ─── Title block HC ───
  const titleY = date ? 220 : 180;
  drawHCTitleBlock(ctx, title, { y: titleY, align: 'left', bgColor: HC.blue, fontSize: 50 });

  // ─── Divider ───
  const divY = titleY + 160;
  ctx.fillStyle = HC.orange;
  ctx.fillRect(50, divY, 100, 4);

  // ─── Caption ───
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '27px sans-serif';
  ctx.textAlign = 'left';
  const capLines = wrapText(ctx, caption, SIZE - 140);
  let y = divY + 40;
  capLines.slice(0, 6).forEach((line) => {
    ctx.fillText(line, 50, y);
    y += 38;
  });

  // ─── Universe label ───
  ctx.fillStyle = theme.bg;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(theme.label, 50, SIZE - 130);

  // ─── HC Footer Bar ───
  drawHCFooterBar(ctx, theme);
}
