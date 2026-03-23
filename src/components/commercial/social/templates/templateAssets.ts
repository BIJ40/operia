/**
 * templateAssets — Centralise les imports d'assets pour les templates sociaux.
 * Logo endossé + pictos univers.
 */
import logoEndosse from '@/assets/help-confort-logo-endosse.jpg';
import pictoPlomberie from '@/assets/picto-plomberie.png';
import pictoElectricite from '@/assets/picto-electricite.png';
import pictoSerrurerie from '@/assets/picto-serrurerie.png';
import pictoMenuiserie from '@/assets/picto-menuiserie.png';
import pictoVitrerie from '@/assets/picto-vitrerie.png';
import pictoVolets from '@/assets/picto-volets.png';
import pictoPmr from '@/assets/picto-pmr.png';
import pictoRenovation from '@/assets/picto-renovation.png';

// Team avatars
import teamFemme1 from '@/assets/team/team-femme-1.png';
import teamFemme2 from '@/assets/team/team-femme-2.png';
import teamFemme3 from '@/assets/team/team-femme-3.png';
import teamHomme1 from '@/assets/team/team-homme-1.png';
import teamHomme2 from '@/assets/team/team-homme-2.png';
import teamHomme3 from '@/assets/team/team-homme-3.png';
import teamHomme4 from '@/assets/team/team-homme-4.png';
import teamHomme5 from '@/assets/team/team-homme-5.png';
import teamHomme6 from '@/assets/team/team-homme-6.png';
import teamHomme7 from '@/assets/team/team-homme-7.png';
import teamHomme8 from '@/assets/team/team-homme-8.png';
import teamHomme9 from '@/assets/team/team-homme-9.png';

const UNIVERSE_PICTOS: Record<string, string> = {
  plomberie: pictoPlomberie,
  electricite: pictoElectricite,
  serrurerie: pictoSerrurerie,
  menuiserie: pictoMenuiserie,
  vitrerie: pictoVitrerie,
  volets: pictoVolets,
  pmr: pictoPmr,
  renovation: pictoRenovation,
};

/** All team avatar sources */
export const TEAM_AVATARS: string[] = [
  teamFemme1, teamFemme2, teamFemme3,
  teamHomme1, teamHomme2, teamHomme3,
  teamHomme4, teamHomme5, teamHomme6,
  teamHomme7, teamHomme8, teamHomme9,
];

/** Returns the endorsed logo source path */
export function getLogoSrc(): string {
  return logoEndosse;
}

/** Returns the picto source for a given universe, or undefined for general */
export function getPictoSrc(universe?: string | null): string | undefined {
  if (!universe) return undefined;
  return UNIVERSE_PICTOS[universe] || undefined;
}

/** Returns a random subset of team avatar sources */
export function getTeamAvatarSrcs(count: number = 6): string[] {
  const shuffled = [...TEAM_AVATARS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, TEAM_AVATARS.length));
}

/** Returns the team group photo source, or undefined if not available */
export function getTeamGroupPhotoSrc(): string | undefined {
  // Will be available once team-group-photo.png is added to assets
  try {
    // Dynamic import not possible at runtime, so we check if the asset was bundled
    return undefined; // Placeholder until image is re-uploaded
  } catch {
    return undefined;
  }
}
