/**
 * Mapping des slugs d'univers vers leurs noms d'affichage complets
 */
export const UNIVERSE_LABELS: Record<string, string> = {
  electricite: "ÉLECTRICITÉ",
  plomberie: "PLOMBERIE",
  volets: "VOLETS ROULANTS",
  ame_logement: "AMÉLIORATION DU LOGEMENT",
  renovation: "RÉNOVATION",
  serrurerie: "SERRURERIE",
  vitrerie: "VITRERIE",
  menuiserie: "MENUISERIE",
};

/**
 * Convertit un slug d'univers en son nom d'affichage
 */
export function getUniverseLabel(slug: string): string {
  return UNIVERSE_LABELS[slug] || slug.toUpperCase();
}

/**
 * Convertit un tableau de slugs d'univers en leurs noms d'affichage
 */
export function getUniverseLabels(slugs: string[]): string[] {
  return slugs.map((slug) => getUniverseLabel(slug));
}
