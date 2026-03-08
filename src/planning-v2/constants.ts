/**
 * Planning V2 — Constantes
 */

// ─── Grille horaire ─────────────────────────────────────────────────────────
export const HOUR_START = 7;
export const HOUR_END = 19;
export const LUNCH_START = 12;
export const LUNCH_END = 13;

// ─── Types de blocs considérés comme "indisponible" ────────────────────────
export const UNAVAILABLE_BLOCK_TYPES = ["conge", "absence", "repos"];
export const TOTAL_HOURS = HOUR_END - HOUR_START; // 12
export const HOUR_HEIGHT_PX = 80; // px par heure dans la vue jour
export const GRID_TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT_PX;

// ─── Colonnes techniciens ───────────────────────────────────────────────────
export const TECH_COLUMN_MIN_WIDTH = 160; // px
export const TECH_COLUMN_MAX_WIDTH = 260; // px
export const TIME_AXIS_WIDTH = 56; // px, colonne des heures

// ─── Semaine ────────────────────────────────────────────────────────────────
export const WEEK_DAYS = 5; // Lundi → Vendredi

// ─── Charge ─────────────────────────────────────────────────────────────────
export const DEFAULT_MAX_DAILY_MINUTES = 420; // 7h
export const DEFAULT_MAX_ROUTE_MINUTES = 120;
export const CHARGE_LIGHT_THRESHOLD = 50;  // %
export const CHARGE_OVERLOAD_THRESHOLD = 90; // %

// ─── Durées fallback par type d'intervention ────────────────────────────────
export const DURATION_FALLBACK: Record<string, number> = {
  depannage: 60,
  travaux: 180,
  tvx: 180,
  rt: 45,
  rdvtech: 45,
  sav: 90,
  diagnostic: 60,
  th: 30,
  default: 60,
};

// ─── Couleurs par défaut ────────────────────────────────────────────────────
export const DEFAULT_TECH_COLOR = "#808080";

export const BLOCK_COLORS: Record<string, string> = {
  conge: "hsl(210 30% 82%)",
  absence: "hsl(0 65% 85%)",
  pause: "hsl(43 50% 82%)",
  tache: "hsl(200 40% 82%)",
  atelier: "hsl(260 40% 82%)",
  formation: "hsl(150 40% 82%)",
  repos: "hsl(210 15% 86%)",
  rappel: "hsl(43 65% 82%)",
};

export const BLOCK_LABELS: Record<string, string> = {
  conge: "Congé",
  absence: "Absence",
  pause: "Pause",
  tache: "Tâche",
  atelier: "Atelier",
  formation: "Formation",
  repos: "Repos",
  rappel: "Tâche",
};

// ─── Badges types intervention ──────────────────────────────────────────────
export const TYPE_LABELS: Record<string, string> = {
  depannage: "Dépannage",
  travaux: "Travaux",
  tvx: "Travaux",
  rt: "RT",
  rdvtech: "RT",
  sav: "SAV",
  diagnostic: "Diag",
  th: "TH",
};

export const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  depannage: { bg: "hsl(200 80% 85%)", text: "hsl(200 80% 22%)" },
  travaux:   { bg: "hsl(150 60% 82%)", text: "hsl(150 60% 18%)" },
  tvx:       { bg: "hsl(150 60% 82%)", text: "hsl(150 60% 18%)" },
  rt:        { bg: "hsl(260 50% 84%)", text: "hsl(260 50% 22%)" },
  rdvtech:   { bg: "hsl(260 50% 84%)", text: "hsl(260 50% 22%)" },
  sav:       { bg: "hsl(0 60% 84%)",   text: "hsl(0 60% 25%)" },
  diagnostic:{ bg: "hsl(43 60% 82%)",  text: "hsl(43 60% 22%)" },
  th:        { bg: "hsl(210 25% 84%)", text: "hsl(210 25% 25%)" },
};
