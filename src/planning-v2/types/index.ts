/**
 * Planning V2 — Types centralisés
 * Modèle de données interne, calculé en mémoire depuis l'API Apogée
 */

// ─── Display ────────────────────────────────────────────────────────────────
export type DisplayDensity = "compact" | "standard" | "detailed";

export type PlanningView = "day" | "week" | "charge" | "map";

// ─── Technicien ─────────────────────────────────────────────────────────────
export type PlanningUserType = "technicien" | "commercial";

export interface PlanningTechnician {
  id: number;
  apogeeId: number;
  name: string;
  initials: string;
  color: string;
  skills: string[];
  univers: string[];
  userType: PlanningUserType;
  workStart: string;   // "07:00"
  workEnd: string;     // "18:00"
  lunchStart: string;  // "12:00"
  lunchEnd: string;    // "13:00"
  active: boolean;
  homeSector: string | null;
  latitude: number | null;
  longitude: number | null;
  maxDailyMinutes: number;
  maxRouteMinutes: number;
  order: number;
}

// ─── Rendez-vous ────────────────────────────────────────────────────────────
export type AppointmentStatus = "planned" | "confirmed" | "in_progress" | "done" | "cancelled";
export type AppointmentPriority = "low" | "normal" | "high" | "urgent";

export interface PlanningAppointment {
  id: string;
  apogeeId: number;
  dossierId: number | null;
  clientId: number | null;
  client: string;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  start: Date;
  end: Date;
  durationMinutes: number;
  universe: string | null;
  type: string;
  priority: AppointmentPriority;
  technicianIds: number[];
  status: AppointmentStatus;
  confirmed: boolean;
  isBinome: boolean;
  apporteur: string | null;
  requiredSkills: string[];
  notes: string | null;
  projectRef: string | null;
  updatedAt: Date | null;
  pictosInterv: string[];
  description: string | null;
  projectState: string | null;
  interventionLabel: string | null;
}

// ─── Blocs (congés, pauses, tâches…) ────────────────────────────────────────
export type BlockType = "conge" | "pause" | "absence" | "tache" | "atelier" | "formation" | "repos" | "rappel";

export interface PlanningBlock {
  id: string;
  techId: number;
  type: BlockType;
  start: Date;
  end: Date;
  label: string;
  color: string | null;
  source: string;
}

// ─── Non planifiés ──────────────────────────────────────────────────────────
export type UnscheduledReason =
  | "urgent"
  | "a_planifier"
  | "en_attente_client"
  | "en_attente_piece"
  | "en_attente_devis"
  | "a_reprogrammer"
  | "non_confirme";

export interface PlanningUnscheduled {
  id: string;
  apogeeId: number;
  dossierId: number;
  client: string;
  city: string | null;
  universe: string | null;
  universes: string[];
  priority: AppointmentPriority;
  estimatedDuration: number;
  estimatedPassages: number | null; // nombre de passages chiffrage
  requiredSkills: string[];
  reason: UnscheduledReason;
  dueDate: Date | null;
  status: string;
  apporteur: string | null;
}

// ─── Alertes ────────────────────────────────────────────────────────────────
export type AlertType =
  | "conflict"
  | "amplitude"
  | "skill_mismatch"
  | "gap"
  | "unassigned"
  | "travel_incoherent"
  | "binome_incomplete";

export type AlertSeverity = "info" | "warning" | "error";

export interface PlanningAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  appointmentId?: string;
  techId?: number;
  date?: string;
  metadata?: Record<string, unknown>;
}

// ─── Charge technicien journalière ──────────────────────────────────────────
export interface GapSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface TechDayLoad {
  techId: number;
  date: string; // YYYY-MM-DD
  rdvCount: number;
  interventionMinutes: number;
  blockedMinutes: number;
  travelMinutes: number;
  freeMinutes: number;
  chargePercent: number;
  gapSlots: GapSlot[];
  hasConflict: boolean;
  hasSkillMismatch: boolean;
  hasAmplitudeOverflow: boolean;
}

// ─── Heatmap semaine ────────────────────────────────────────────────────────
export type LoadStatus = "light" | "normal" | "overload" | "absent";

export interface WeekHeatmapCell {
  techId: number;
  date: string;
  load: number;
  rdvCount: number;
  travelMinutes: number;
  status: LoadStatus;
  alertsCount: number;
}

// ─── Données normalisées ────────────────────────────────────────────────────
export interface NormalizedPlanningData {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  unscheduled: PlanningUnscheduled[];
}

// ─── Filtres ────────────────────────────────────────────────────────────────
export interface PlanningFilters {
  selectedDate: Date;
  view: PlanningView;
  density: DisplayDensity;
  technicianIds: number[];
  universes: string[];
  statuses: AppointmentStatus[];
  showBlocks: boolean;
  showUnconfirmed: boolean;
  granularity: 15 | 30 | 60;
}

// ─── Display Settings (hover / carte) ───────────────────────────────────────
export interface HoverDisplaySettings {
  showClient: boolean;
  showCity: boolean;
  showAddress: boolean;
  showType: boolean;
  showUniverse: boolean;
  showDuration: boolean;
  showStatus: boolean;
  showApporteur: boolean;
  showProjectRef: boolean;
  showNotes: boolean;
  showTechnicians: boolean;
  showPriority: boolean;
  showTime: boolean;
}

export const DEFAULT_HOVER_SETTINGS: HoverDisplaySettings = {
  showClient: true,
  showCity: true,
  showAddress: true,
  showType: true,
  showUniverse: true,
  showDuration: true,
  showStatus: true,
  showApporteur: false,
  showProjectRef: false,
  showNotes: false,
  showTechnicians: true,
  showPriority: true,
  showTime: true,
};
