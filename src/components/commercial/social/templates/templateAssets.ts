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

/** Returns the endorsed logo source path */
export function getLogoSrc(): string {
  return logoEndosse;
}

/** Returns the picto source for a given universe, or undefined for general */
export function getPictoSrc(universe?: string | null): string | undefined {
  if (!universe) return undefined;
  return UNIVERSE_PICTOS[universe] || undefined;
}
