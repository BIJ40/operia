/**
 * Zone mapping — Associe chaque ville à sa zone d'intervention
 * Réutilisé dans le planning et les vues pilotage.
 */

// Couleurs fixes par zone (mapping HelpConfort)
export const ZONE_COLOR_MAP: Record<string, string> = {
  "peyrehorade": "#9CA3AF", // gris
  "hagetmau": "#8B5CF6",    // violet
  "mimizan": "#EAB308",     // jaune
  "capbreton": "#F97316",   // orange
  "mont de marsan": "#3B82F6", // bleu
  "dax": "#22C55E",         // vert
  "pays basque": "#EF4444", // rouge
};

// Fallback pour zones non mappées
const FALLBACK_COLORS = ["#6B7280", "#A78BFA", "#FBBF24", "#FB923C", "#60A5FA", "#4ADE80", "#F87171", "#2DD4BF", "#F472B6", "#818CF8"];
let fallbackIndex = 0;
const fallbackCache = new Map<string, string>();

export function getZoneColor(zone: string): string {
  const key = zone.toLowerCase().trim();
  if (ZONE_COLOR_MAP[key]) return ZONE_COLOR_MAP[key];
  if (fallbackCache.has(key)) return fallbackCache.get(key)!;
  const color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
  fallbackCache.set(key, color);
  fallbackIndex++;
  return color;
}

/** Liste ordonnée de toutes les zones connues */
export const ZONE_NAMES = Object.keys(ZONE_COLOR_MAP);

/**
 * Mappe une ville vers sa zone.
 * Cherche si le nom de la ville contient un des noms de zone (match partiel insensible à la casse).
 * Fallback : la ville elle-même devient sa propre zone.
 */
export function villeToZone(ville: string): string {
  if (!ville || ville === '—') return '';
  const lower = ville.toLowerCase().trim();
  // Exact match first
  if (ZONE_COLOR_MAP[lower]) return lower;
  // Partial match (ville contains zone name or zone name contains ville)
  for (const zone of ZONE_NAMES) {
    if (lower.includes(zone) || zone.includes(lower)) return zone;
  }
  // Fallback: ville is its own zone
  return lower;
}
