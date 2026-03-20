/**
 * signatureEngine — Pure function that computes the full visual payload
 */
import type { SignatureConfig, SignatureProfile } from '@/hooks/useSignature';
import { getAutoSeason, getAutoEvent } from '@/hooks/useSignature';

export interface SignaturePayload {
  background: string;
  overlays: string[];
  colors: { primary: string; accent: string; text: string; bg: string };
  typography: { heading: string; body: string };
  layout: 'classic' | 'modern' | 'minimal';
  statusBadge: { label: string; color: string; pulse?: boolean } | null;
  decorations: string[];
  profile: SignatureProfile;
}

const REGION_BG: Record<string, string> = {
  landes: 'linear-gradient(135deg, #1B3A5C 0%, #2D6A4F 50%, #E8763A 100%)',
  pyrenees: 'linear-gradient(135deg, #2C3E50 0%, #4A6741 50%, #8B9DC3 100%)',
  paris: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  cote_basque: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 50%, #90E0EF 100%)',
  default: 'linear-gradient(135deg, #1B3A5C 0%, #2A5298 100%)',
};

const SEASON_COLORS: Record<string, { overlay: string; tint: string }> = {
  spring: { overlay: 'rgba(144,238,144,0.08)', tint: '#4CAF50' },
  summer: { overlay: 'rgba(255,193,7,0.08)', tint: '#FF9800' },
  autumn: { overlay: 'rgba(230,126,34,0.10)', tint: '#E67E22' },
  winter: { overlay: 'rgba(52,152,219,0.08)', tint: '#3498DB' },
};

const EVENT_DECORATIONS: Record<string, string[]> = {
  noel: ['✨', '🎄'],
  halloween: ['🎃', '👻'],
  saint_valentin: ['❤️'],
  rentree: ['📐'],
};

const TYPOGRAPHY_MAP: Record<string, { heading: string; body: string }> = {
  corporate: { heading: "'Playfair Display', serif", body: "'Inter', sans-serif" },
  futur: { heading: "'Orbitron', sans-serif", body: "'Inter', sans-serif" },
  dessin: { heading: "'Caveat', cursive", body: "'Inter', sans-serif" },
  premium: { heading: "'Cinzel', serif", body: "'Inter', sans-serif" },
  minimal: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; pulse?: boolean }> = {
  ouvert: { label: 'Ouvert', color: '#22c55e' },
  ferme: { label: 'Fermé', color: '#ef4444' },
  urgence: { label: 'Urgence', color: '#f97316', pulse: true },
  dispo: { label: 'Disponible', color: '#3b82f6' },
};

export function generateSignaturePayload(
  config: SignatureConfig,
  profile: SignatureProfile
): SignaturePayload {
  const effectiveSeason = config.auto_mode ? getAutoSeason() : (config.season === 'auto' ? getAutoSeason() : config.season);
  const effectiveEvent = config.auto_mode ? getAutoEvent() : config.temporal_event;

  const regionBg = REGION_BG[config.region] || REGION_BG.default;
  const seasonData = SEASON_COLORS[effectiveSeason] || SEASON_COLORS.spring;

  const overlays: string[] = [];
  if (seasonData.overlay) overlays.push(seasonData.overlay);

  const decorations: string[] = [];
  if (effectiveEvent && EVENT_DECORATIONS[effectiveEvent]) {
    decorations.push(...EVENT_DECORATIONS[effectiveEvent]);
  }

  const palette = config.color_palette || { primary: '#1B3A5C', accent: '#E8763A' };
  const typo = TYPOGRAPHY_MAP[config.typography] || TYPOGRAPHY_MAP.corporate;

  const layoutMap: Record<string, 'classic' | 'modern' | 'minimal'> = {
    corporate: 'classic',
    futur: 'modern',
    minimal: 'minimal',
    dessin: 'classic',
    peinture: 'classic',
    premium: 'modern',
  };

  return {
    background: regionBg,
    overlays,
    colors: {
      primary: palette.primary || '#1B3A5C',
      accent: palette.accent || '#E8763A',
      text: palette.text || '#ffffff',
      bg: palette.bg || '#ffffff',
    },
    typography: typo,
    layout: layoutMap[config.style] || 'classic',
    statusBadge: config.agency_status ? STATUS_BADGE[config.agency_status] || null : null,
    decorations,
    profile,
  };
}

export function generateSignatureHTML(payload: SignaturePayload): string {
  const { profile, colors, typography, statusBadge, decorations } = payload;
  const decoStr = decorations.length > 0 ? ` ${decorations.join(' ')}` : '';
  const badgeHtml = statusBadge
    ? `<span style="display:inline-block;background:${statusBadge.color};color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;margin-left:8px;vertical-align:middle;">${statusBadge.label}</span>`
    : '';

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${typography.body};color:${colors.primary};max-width:500px;">
  <tr>
    <td style="padding:0 16px 0 0;vertical-align:top;">
      ${profile.logo_url ? `<img src="${profile.logo_url}" width="80" height="80" style="border-radius:12px;object-fit:contain;" alt="Logo" />` : `<div style="width:80px;height:80px;border-radius:12px;background:${colors.primary};display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;font-family:${typography.heading};">${(profile.first_name?.[0] || '').toUpperCase()}${(profile.last_name?.[0] || '').toUpperCase()}</div>`}
    </td>
    <td style="vertical-align:top;">
      <p style="margin:0;font-size:16px;font-weight:700;font-family:${typography.heading};color:${colors.primary};">
        ${profile.first_name} ${profile.last_name}${decoStr}${badgeHtml}
      </p>
      <p style="margin:2px 0 0;font-size:12px;color:${colors.accent};font-weight:600;">
        ${profile.job_title}
      </p>
      <p style="margin:0;font-size:12px;color:#666;">
        ${profile.agency_name}
      </p>
      <hr style="border:none;border-top:1px solid ${colors.accent};margin:8px 0;opacity:0.4;" />
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:11px;color:#555;">
        <tr>
          <td style="padding-right:12px;">📞 <a href="tel:${profile.phone}" style="color:#555;text-decoration:none;">${profile.phone}</a></td>
          <td style="padding-right:12px;">✉️ <a href="mailto:${profile.email}" style="color:${colors.accent};text-decoration:none;">${profile.email}</a></td>
        </tr>
      </table>
      ${profile.website ? `<p style="margin:4px 0 0;font-size:11px;"><a href="${profile.website}" style="color:${colors.accent};text-decoration:none;">🌐 ${profile.website.replace(/^https?:\/\//, '')}</a></p>` : ''}
    </td>
  </tr>
</table>`;
}
