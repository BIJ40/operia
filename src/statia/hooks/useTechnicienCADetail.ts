/**
 * Hook de diagnostic CA Technicien
 * Permet d'analyser en détail le calcul du CA d'un technicien spécifique
 */

import { useMemo } from "react";
import { isWithinInterval } from "date-fns";
import { extractFactureMeta } from "@/statia/rules/rules";
import { normalizeUniversSlug } from "@/statia/engine/normalizers";

export interface CADetailLine {
  factureId: string;
  factureRef?: string;
  projectId: string;
  dateFacture: Date;
  totalHT: number;
  partTechnicien: number; // Proportion (0-1)
  caTechnicien: number; // Montant attribué
  dureeTechMinutes: number;
  dureeTotaleMinutes: number;
  universes: string[];
  interventionsTypes: string[]; // Types des interventions sur ce projet
  raison: string; // Pourquoi attribué
}

export interface TechnicienCADetailResult {
  technicienId: string;
  technicienNom: string;
  totalCA: number;
  totalHeures: number;
  nbFactures: number;
  details: CADetailLine[];
  diagnostics: {
    nbInterventionsExcluesRT: number;
    nbInterventionsExcluesSAV: number;
    nbInterventionsExcluesNonProductives: number;
    nbInterventionsProductives: number;
    projectsAvecTemps: string[];
  };
}

/**
 * Fonction de diagnostic - détaille le calcul CA pour un technicien donné
 */
export function computeTechnicienCADetail(
  technicienId: string | number,
  factures: any[],
  projects: any[],
  interventions: any[],
  users: any[],
  dateRange: { start: Date; end: Date }
): TechnicienCADetailResult | null {
  const techIdStr = String(technicienId);
  const techIdNum = Number(technicienId);

  // Trouver le technicien
  const techUser = users.find(
    (u) => String(u.id) === techIdStr || u.id === techIdNum
  );
  
  const technicienNom = techUser
    ? `${techUser.firstname || ""} ${techUser.name || techUser.lastname || ""}`.trim() || `Tech ${techIdStr}`
    : `Tech ${techIdStr}`;

  // Maps pour accès rapide
  const projectsMap = new Map(projects.map((p) => [String(p.id), p]));
  const usersMap = new Map(users.map((u) => [u.id, u]));

  // Diagnostics d'exclusion
  let nbInterventionsExcluesRT = 0;
  let nbInterventionsExcluesSAV = 0;
  let nbInterventionsExcluesNonProductives = 0;
  let nbInterventionsProductives = 0;

  // Calculer le temps par technicien par projet (avec logging)
  const dureeTechParProjet: Record<string, Record<string, number>> = {};
  const dureeTotaleParProjet: Record<string, number> = {};
  const projectsAvecTemps: string[] = [];

  // Types d'intervention par projet (pour diagnostic)
  const interventionTypesParProjet: Record<string, string[]> = {};

  interventions.forEach((intervention) => {
    const projectId = String(intervention.projectId || intervention.refProjectId);
    if (!projectId) return;

    // Analyse des types
    const type2Raw = intervention.type2 || intervention.data?.type2 || "";
    const type2Lower = type2Raw.toLowerCase().trim();
    const typeRaw = (intervention.type || intervention.data?.type || "").toLowerCase().trim();

    if (!interventionTypesParProjet[projectId]) {
      interventionTypesParProjet[projectId] = [];
    }
    interventionTypesParProjet[projectId].push(`${type2Raw || typeRaw || "?"}`);

    // Test RT explicite
    const isRTExplicit =
      type2Lower === "rt" ||
      type2Lower.includes("relevé technique") ||
      type2Lower.includes("releve technique") ||
      type2Lower.includes("rdv technique") ||
      typeRaw === "rt";

    const hasBiRt = intervention.data?.biRt?.isValidated === true || intervention.data?.isRT === true;
    const hasBiDepan = intervention.data?.biDepan;
    const hasBiTvx = intervention.data?.biTvx;
    const isRTViaBi = hasBiRt && !hasBiDepan && !hasBiTvx;

    if (isRTExplicit || isRTViaBi) {
      nbInterventionsExcluesRT++;
      return;
    }

    // Test SAV
    if (type2Lower === "sav" || typeRaw === "sav") {
      nbInterventionsExcluesSAV++;
      return;
    }

    // Test productif
    if (!hasBiDepan && !hasBiTvx) {
      nbInterventionsExcluesNonProductives++;
      return;
    }

    nbInterventionsProductives++;

    // Initialiser le projet
    if (!dureeTechParProjet[projectId]) {
      dureeTechParProjet[projectId] = {};
      dureeTotaleParProjet[projectId] = 0;
    }

    // Parcourir les visites validées
    const visites = intervention.data?.visites || [];
    visites.forEach((visite: any) => {
      if (visite.state !== "validated") return;

      const duree = Number(visite.duree) || 0;
      if (duree <= 0) return;

      const usersIds = visite.usersIds || [];
      usersIds.forEach((userId: number) => {
        const userIdStr = String(userId);
        if (!dureeTechParProjet[projectId][userIdStr]) {
          dureeTechParProjet[projectId][userIdStr] = 0;
        }
        dureeTechParProjet[projectId][userIdStr] += duree;
        dureeTotaleParProjet[projectId] += duree;

        // Track si c'est notre technicien cible
        if (userIdStr === techIdStr || userId === techIdNum) {
          if (!projectsAvecTemps.includes(projectId)) {
            projectsAvecTemps.push(projectId);
          }
        }
      });
    });
  });

  // Traiter les factures
  const details: CADetailLine[] = [];
  let totalCA = 0;
  let totalHeures = 0;

  factures.forEach((facture) => {
    const meta = extractFactureMeta(facture);
    if (!meta.date) return;
    if (facture.state === "canceled") return;

    if (!isWithinInterval(meta.date, { start: dateRange.start, end: dateRange.end })) {
      return;
    }

    if (meta.montantNetHT === 0) return;

    const projectId = String(facture.projectId);
    if (!projectId) return;

    const project = projectsMap.get(projectId);
    if (!project) return;

    // Univers
    const universesRaw: string[] =
      project.data?.universes || project.data?.univers || project.universes || [];
    const universes = universesRaw.map((u: string) => normalizeUniversSlug(u));

    if (universes.length === 0) return;

    // Durées par technicien
    const dureesParTech = dureeTechParProjet[projectId] || {};
    const dureeTotale = dureeTotaleParProjet[projectId] || 0;

    if (dureeTotale === 0) return;

    // Vérifier si notre technicien a du temps sur ce projet
    const dureeTech = dureesParTech[techIdStr] || 0;
    if (dureeTech === 0) return;

    const partTech = dureeTech / dureeTotale;
    const caTech = meta.montantNetHT * partTech;

    totalCA += caTech;
    totalHeures += dureeTech / 60;

    details.push({
      factureId: facture.id,
      factureRef: facture.reference || facture.numeroFacture,
      projectId,
      dateFacture: meta.date,
      totalHT: meta.montantNetHT,
      partTechnicien: partTech,
      caTechnicien: Math.round(caTech * 100) / 100,
      dureeTechMinutes: dureeTech,
      dureeTotaleMinutes: dureeTotale,
      universes,
      interventionsTypes: interventionTypesParProjet[projectId] || [],
      raison: `${Math.round(partTech * 100)}% du temps (${dureeTech}min/${dureeTotale}min)`,
    });
  });

  return {
    technicienId: techIdStr,
    technicienNom,
    totalCA: Math.round(totalCA * 100) / 100,
    totalHeures: Math.round(totalHeures * 10) / 10,
    nbFactures: details.length,
    details: details.sort((a, b) => b.caTechnicien - a.caTechnicien),
    diagnostics: {
      nbInterventionsExcluesRT,
      nbInterventionsExcluesSAV,
      nbInterventionsExcluesNonProductives,
      nbInterventionsProductives,
      projectsAvecTemps,
    },
  };
}

/**
 * Hook pour diagnostiquer le CA d'un technicien
 */
export function useTechnicienCADetail(
  technicienId: string | number | null,
  factures: any[],
  projects: any[],
  interventions: any[],
  users: any[],
  dateRange: { start: Date; end: Date }
): TechnicienCADetailResult | null {
  return useMemo(() => {
    if (!technicienId) return null;
    return computeTechnicienCADetail(
      technicienId,
      factures,
      projects,
      interventions,
      users,
      dateRange
    );
  }, [technicienId, factures, projects, interventions, users, dateRange]);
}
