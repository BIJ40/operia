/**
 * Template : brand_card — Créa branding / fallback 1080x1080
 * V7 — Team avatars grid for brand/prospection posts without media.
 */
import {
  SIZE, loadImage, drawCover,
  getTheme, HC, ZONES,
  drawGradientBg, drawHCFooterBar, drawHCLogo,
  drawContain, drawHookText, drawSubText, drawCTAButton,
  drawCinematicOverlay, drawUniversePill, roundRect,
} from './canvasHelpers';
import { getLogoSrc, getPictoSrc, getTeamAvatarSrcs } from './templateAssets';
import bannerSrc from '@/assets/banniere_helpconfort.jpg';
import type { SocialTemplatePayload } from '../SocialVisualCanvas';

/** Draw circular avatar with HC-blue border */
async function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  src: string,
  cx: number,
  cy: number,
  radius: number,
) {
  try {
    const img = await loadImage(src);
    ctx.save();
    // Blue border circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = HC.blue;
    ctx.fill();
    // White inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = HC.white;
    ctx.fill();
    // Clip to circle and draw image
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    // Draw image covering the circle
    const size = radius * 2;
    const aspect = img.naturalWidth / img.naturalHeight;
    let dw: number, dh: number;
    if (aspect > 1) {
      dh = size;
      dw = size * aspect;
    } else {
      dw = size;
      dh = size / aspect;
    }
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  } catch {
    // Fallback: blue circle with white silhouette
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = HC.blue;
    ctx.fill();
  }
}

/** Draw team avatars grid in ZONE 2 */
async function drawTeamGrid(ctx: CanvasRenderingContext2D) {
  const avatarSrcs = getTeamAvatarSrcs(6);
  const count = avatarSrcs.length;
  if (count === 0) return;

  const gridY = 200; // vertical start
  const radius = 70;
  const cols = 3;
  const rows = Math.ceil(count / cols);
  const spacingX = 260;
  const spacingY = 200;
  const startX = (SIZE - (cols - 1) * spacingX) / 2;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * spacingX;
    const cy = gridY + row * spacingY;
    await drawCircularAvatar(ctx, avatarSrcs[i], cx, cy, radius);
  }

  // "Notre équipe" label
  ctx.save();
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('Notre équipe à votre service', SIZE / 2, gridY + rows * spacingY + 30);
  ctx.restore();
}

export async function drawBrandCard(ctx: CanvasRenderingContext2D, payload: SocialTemplatePayload) {
  const theme = getTheme(payload.universe, payload.topicType);
  const cta = payload.cta || 'Appelez-nous';
  const isTeamPost = payload.showTeam || payload.topicType === 'prospection' || payload.topicType === 'calendar';

  // ─── ZONE 2: Background ───
  if (payload.mediaUrl) {
    try {
      const img = await loadImage(payload.mediaUrl);
      drawCover(ctx, img, 0, 0, SIZE, SIZE);
      drawCinematicOverlay(ctx, 0.72);
    } catch {
      drawGradientBg(ctx, HC.blue, HC.blueDark);
    }
  } else {
    drawGradientBg(ctx, HC.blue, HC.blueDark);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = -SIZE; i < SIZE * 2; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + SIZE, SIZE);
      ctx.stroke();
    }
  }

  // ─── ZONE 1: Top bar ───
  ctx.fillStyle = HC.orange;
  ctx.fillRect(0, 0, SIZE, 6);
  await drawHCLogo(ctx, getLogoSrc(), 'top-left');
  await drawUniversePill(ctx, theme, 35, getPictoSrc(payload.universe));

  // ─── ZONE 2: Content (team avatars OR banner) ───
  if (!payload.mediaUrl) {
    if (isTeamPost) {
      await drawTeamGrid(ctx);
    } else {
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
  }

  // ─── ZONE 3: Hook + subtext ───
  const { bottomY: hookBottom } = drawHookText(ctx, payload.hook || payload.title || 'Help Confort', {
    y: ZONES.TEXT_START,
    align: 'left',
    color: HC.white,
  });

  if (payload.caption) {
    drawSubText(ctx, payload.caption, {
      y: hookBottom + 14,
      align: 'center',
      color: 'rgba(255,255,255,0.88)',
    });
  }

  // ─── ZONE 4: CTA ───
  drawCTAButton(ctx, cta, { align: 'center' });

  // ─── ZONE 5: Footer ───
  await drawHCFooterBar(ctx, theme, undefined, getPictoSrc(payload.universe));
}
