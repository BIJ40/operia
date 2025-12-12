/**
 * Types pour le planning Apogée
 */

export type ApogeeUser = {
  id: number;
  firstname?: string | null;
  name?: string | null;
  type?: string | null;     // "technicien", "utilisateur", "admin", "commercial"
  is_on?: boolean | null;   // actif
  data?: { bgcolor?: { hex?: string; hex8?: string } | null } | null;
};

export type PlanningCreneau = {
  id: number;
  refType: string;     // "visite-interv" | "conge" | "rappel" | ...
  date: string;        // ex "2025-12-22T08:00"
  duree: number;       // minutes
  usersIds: number[];
};

export type PlanningEvent = {
  id: string;
  refType: string;
  start: Date;
  end: Date;
  userId: number;
  title: string;
  color?: string;
  creneauId: number;
  dureeMin: number;
};
