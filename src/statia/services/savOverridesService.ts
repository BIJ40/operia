/**
 * Service centralisé pour les overrides SAV
 * Source de vérité unique pour les décisions SAV (confirmé/infirmé, technicien, coût)
 * 
 * Ce service est utilisé par toutes les métriques SAV pour garantir la cohérence
 * entre le tableau de gestion SAV et les statistiques calculées.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SAVOverride {
  project_id: number;
  agency_id: string;
  is_confirmed_sav: boolean | null;
  cout_sav_manuel: number | null;
  techniciens_override: number[] | null;
  notes: string | null;
}

export interface SAVOverridesData {
  overrides: SAVOverride[];
  overridesMap: Map<number, SAVOverride>;
  // Projets explicitement confirmés SAV
  confirmedSavProjectIds: Set<number>;
  // Projets explicitement infirmés (non SAV)
  infirmedProjectIds: Set<number>;
  // Map technicien par projet (override)
  techniciensByProject: Map<number, number[]>;
  // Coûts manuels par projet
  coutsByProject: Map<number, number>;
}

/**
 * Charge les overrides SAV pour une agence donnée (par UUID)
 */
export async function loadSAVOverridesByAgencyUuid(agencyUuid: string): Promise<SAVOverridesData> {
  const { data, error } = await supabase
    .from("sav_dossier_overrides")
    .select("project_id, agency_id, is_confirmed_sav, cout_sav_manuel, techniciens_override, notes")
    .eq("agency_id", agencyUuid);

  if (error) {
    console.error("[SAVOverridesService] Error loading overrides:", error);
    return createEmptyOverridesData();
  }

  return buildOverridesData(data || []);
}

/**
 * Charge les overrides SAV pour une agence donnée (par slug)
 */
export async function loadSAVOverridesBySlug(agencySlug: string): Promise<SAVOverridesData> {
  // D'abord récupérer l'UUID de l'agence
  const { data: agencyData, error: agencyError } = await supabase
    .from("apogee_agencies")
    .select("id")
    .eq("slug", agencySlug)
    .single();

  if (agencyError || !agencyData) {
    console.error("[SAVOverridesService] Error loading agency:", agencyError);
    return createEmptyOverridesData();
  }

  return loadSAVOverridesByAgencyUuid(agencyData.id);
}

/**
 * Construit les structures de données optimisées à partir des overrides bruts
 */
function buildOverridesData(rawOverrides: any[]): SAVOverridesData {
  const overrides: SAVOverride[] = rawOverrides.map(o => ({
    project_id: o.project_id,
    agency_id: o.agency_id,
    is_confirmed_sav: o.is_confirmed_sav,
    cout_sav_manuel: o.cout_sav_manuel,
    techniciens_override: o.techniciens_override,
    notes: o.notes,
  }));

  const overridesMap = new Map<number, SAVOverride>();
  const confirmedSavProjectIds = new Set<number>();
  const infirmedProjectIds = new Set<number>();
  const techniciensByProject = new Map<number, number[]>();
  const coutsByProject = new Map<number, number>();

  for (const override of overrides) {
    overridesMap.set(override.project_id, override);

    // SAV confirmé explicitement
    if (override.is_confirmed_sav === true) {
      confirmedSavProjectIds.add(override.project_id);
    }
    // SAV infirmé explicitement
    else if (override.is_confirmed_sav === false) {
      infirmedProjectIds.add(override.project_id);
    }

    // Techniciens override
    if (override.techniciens_override && override.techniciens_override.length > 0) {
      techniciensByProject.set(override.project_id, override.techniciens_override);
    }

    // Coût manuel
    if (override.cout_sav_manuel != null && override.cout_sav_manuel > 0) {
      coutsByProject.set(override.project_id, override.cout_sav_manuel);
    }
  }

  return {
    overrides,
    overridesMap,
    confirmedSavProjectIds,
    infirmedProjectIds,
    techniciensByProject,
    coutsByProject,
  };
}

function createEmptyOverridesData(): SAVOverridesData {
  return {
    overrides: [],
    overridesMap: new Map(),
    confirmedSavProjectIds: new Set(),
    infirmedProjectIds: new Set(),
    techniciensByProject: new Map(),
    coutsByProject: new Map(),
  };
}

/**
 * Détermine si un projet doit être compté comme SAV
 * en tenant compte des overrides (source de vérité)
 * 
 * @param projectId ID du projet
 * @param isAutoDetectedSAV Résultat de la détection automatique
 * @param overridesData Données des overrides
 * @returns true si le projet doit être compté comme SAV
 */
export function isProjectConfirmedSAV(
  projectId: number,
  isAutoDetectedSAV: boolean,
  overridesData: SAVOverridesData
): boolean {
  const override = overridesData.overridesMap.get(projectId);

  // Override explicite : priorité absolue
  if (override) {
    if (override.is_confirmed_sav === false) {
      // Infirmé = jamais SAV
      return false;
    }
    if (override.is_confirmed_sav === true) {
      // Confirmé = toujours SAV
      return true;
    }
    // null = pas de décision, utiliser auto-détection
  }

  // Fallback: auto-détection
  return isAutoDetectedSAV;
}

/**
 * Récupère les techniciens pour un projet SAV
 * Priorité: override > auto-détecté
 */
export function getSAVTechnicians(
  projectId: number,
  autoDetectedTechnicians: number[],
  overridesData: SAVOverridesData
): number[] {
  const override = overridesData.techniciensByProject.get(projectId);
  if (override && override.length > 0) {
    return override;
  }
  return autoDetectedTechnicians;
}

/**
 * Récupère le coût SAV pour un projet
 * Priorité: manuel > estimé
 */
export function getSAVCost(
  projectId: number,
  estimatedCost: number,
  overridesData: SAVOverridesData
): number {
  const manualCost = overridesData.coutsByProject.get(projectId);
  if (manualCost != null) {
    return manualCost;
  }
  return estimatedCost;
}
