/**
 * MOTEUR UNIFIÉ : Calcul CA par Technicien × Univers
 * Source de vérité unique pour agence ET réseau (Franchiseur)
 * 
 * Conforme aux règles métier STATIA_RULES v1.0 :
 * - Exclusion RT (biRt.isValidated ou type2="RT")
 * - Exclusion SAV (type2 ou type contient "sav")
 * - Types productifs uniquement (biDepan ou biTvx)
 * - Visites validées uniquement (state="validated")
 * - Techniciens identifiés via: isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
 * - Techniciens actifs uniquement (is_on=true ou isActive=true)
 * - CA réparti au prorata du temps passé
 * - Multi-univers : répartition égale entre univers
 */

import { isWithinInterval } from "date-fns";
import { buildTechMap, resolveTech, TechnicienInfo } from "@/apogee-connect/utils/techTools";
import { extractFactureMeta } from "@/statia/rules/rules";
// Import centralisé depuis StatIA normalizers (source unique de vérité)
import { normalizeUniversSlug } from "@/statia/engine/normalizers";
import { logDebug } from "@/lib/logger";

// ===============================
// TYPES
// ===============================

export interface TechUniversStats {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
  agenceSlug?: string;
  agenceLabel?: string;
  universes: {
    [universSlug: string]: {
      caHT: number;
      heures: number;
      caParHeure: number;
      nbDossiers: number;
    };
  };
  totaux: {
    caHT: number;
    heures: number;
    caParHeure: number;
    nbDossiers: number;
  };
}

interface DureeTechParProjet {
  [projectId: string]: {
    [techId: string]: number; // durée en minutes
  };
}

interface DureeTotaleParProjet {
  [projectId: string]: number; // durée totale en minutes
}

// ===============================
// NORMALISATION UNIVERS
// ===============================

/**
 * Normaliser les slugs d'univers - utilise le normalizer centralisé StatIA
 */
export function normalizeUniverseSlug(slug: string): string {
  return normalizeUniversSlug(slug);
}

// Univers à exclure (obsolètes ou non pertinents)
const EXCLUDED_UNIVERSES = new Set([
  'mobilier',
  'travaux_xterieurs',
  'travaux_exterieurs',
]);

// ===============================
// IDENTIFICATION TECHNICIEN
// ===============================

/**
 * Détermine si un user est un technicien actif selon les règles métier
 * RÈGLE: isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
 * ET actif (is_on=true ou isActive=true)
 */
export function isActiveTechnician(user: any): boolean {
  if (!user) return false;

  // Vérifier universes à plusieurs niveaux (data.universes ou universes direct)
  const hasUniverses = 
    (Array.isArray(user?.data?.universes) && user.data.universes.length > 0) ||
    (Array.isArray(user?.universes) && user.universes.length > 0);
  
  const isTechnicien =
    user?.isTechnicien === true ||
    user?.isTechnicien === 1 ||
    user?.type === "technicien" ||
    user?.type?.toLowerCase() === "technicien" ||
    (user?.type === "utilisateur" && hasUniverses) ||
    (user?.type?.toLowerCase() === "utilisateur" && hasUniverses);

  // Vérification plus souple pour is_on/isActive (accepte true, 1, "1", "true")
  const isActive = 
    user?.is_on === true || 
    user?.is_on === 1 ||
    user?.is_on === "1" ||
    user?.isActive === true || 
    user?.isActive === 1 ||
    user?.isActive === "1" ||
    // Fallback: si pas de champ explicite, considérer actif par défaut si c'est un technicien
    (user?.is_on === undefined && user?.isActive === undefined);

  return isTechnicien && isActive;
}

// ===============================
// CALCUL TEMPS PAR PROJET
// ===============================

/**
 * Calcule le temps passé par chaque technicien sur chaque projet
 * RÈGLES APPLIQUÉES :
 * - Exclusion RT (biRt.isValidated ou type2="RT")
 * - Exclusion SAV (type2 ou type contient "sav")
 * - Types productifs uniquement (biDepan ou biTvx)
 * - Visites validées uniquement (state="validated")
 * - Durée > 0
 * - Techniciens actifs uniquement
 */
export function calculateTechTimeByProject(
  interventions: any[],
  usersMap: Map<number, any>
): { dureeTechParProjet: DureeTechParProjet; dureeTotaleParProjet: DureeTotaleParProjet } {
  const dureeTechParProjet: DureeTechParProjet = {};
  const dureeTotaleParProjet: DureeTotaleParProjet = {};

  interventions.forEach((intervention) => {
    const projectId = intervention.projectId || intervention.refProjectId;
    if (!projectId) return;

    // RÈGLE RENFORCÉE: Exclure les RT (relevés techniques)
    const type2Raw = (intervention.type2 || intervention.data?.type2 || "");
    const type2Lower = type2Raw.toLowerCase().trim();
    const typeRaw = (intervention.type || intervention.data?.type || "").toLowerCase().trim();
    
    // RT explicite via type2 ou type
    const isRTExplicit = 
      type2Lower === "rt" ||
      type2Lower.includes("relevé technique") ||
      type2Lower.includes("releve technique") ||
      type2Lower.includes("rdv technique") ||
      typeRaw === "rt" ||
      typeRaw.includes("relevé technique");
    
    // RT via biRt seul (sans travaux)
    const hasBiRt = intervention.data?.biRt?.isValidated === true || intervention.data?.isRT === true;
    const hasBiDepan = intervention.data?.biDepan;
    const hasBiTvx = intervention.data?.biTvx;
    
    const isRTViaBi = hasBiRt && !hasBiDepan && !hasBiTvx;
    
    if (isRTExplicit || isRTViaBi) return;

    // RÈGLE: Exclure les SAV (égalité stricte)
    const isSAV = type2Lower === "sav" || typeRaw === "sav";
    if (isSAV) return;

    // RÈGLE STRICTE: Types productifs uniquement (biDepan ou biTvx requis)
    const isProductive = hasBiDepan || hasBiTvx;
    if (!isProductive) return;

    // Initialiser le projet si nécessaire
    const projKey = String(projectId);
    if (!dureeTechParProjet[projKey]) {
      dureeTechParProjet[projKey] = {};
      dureeTotaleParProjet[projKey] = 0;
    }

    // RÈGLE: Parcourir les visites VALIDÉES uniquement
    const visites = intervention.data?.visites || [];
    visites.forEach((visite: any) => {
      if (visite.state !== "validated") return;

      const duree = Number(visite.duree) || 0;
      if (duree <= 0) return;

      const usersIds = visite.usersIds || [];

      // RÈGLE: Ne compter que les techniciens actifs
      const technicienIds = usersIds.filter((userId: number) => {
        const user = usersMap.get(userId);
        return isActiveTechnician(user);
      });

      // Si aucun technicien sur cette visite, ignorer
      if (technicienIds.length === 0) return;

      technicienIds.forEach((techId: number) => {
        const techKey = String(techId);
        if (!dureeTechParProjet[projKey][techKey]) {
          dureeTechParProjet[projKey][techKey] = 0;
        }
        // Chaque technicien compte la durée complète de la visite
        dureeTechParProjet[projKey][techKey] += duree;
        dureeTotaleParProjet[projKey] += duree;
      });
    });
  });

  return { dureeTechParProjet, dureeTotaleParProjet };
}

// ===============================
// MOTEUR PRINCIPAL
// ===============================

/**
 * Calcule les statistiques CA et heures par technicien et par univers
 * pour une agence donnée (factures, projects, interventions, users)
 * 
 * C'est la fonction de référence unique utilisée par :
 * - Page agence (IndicateursTechniciens)
 * - Agrégation réseau (FranchiseurStats)
 */
export function computeTechUniversStatsForAgency(
  factures: any[],
  projects: any[],
  interventions: any[],
  users: any[],
  dateRange?: { start: Date; end: Date }
): TechUniversStats[] {
  // Construire les maps
  const usersMap = new Map<number, any>(users.map((u) => [u.id, u]));
  const projectsMap = new Map(projects.map((p) => [p.id, p]));
  const TECHS = buildTechMap(users);

  // Calculer le temps par technicien par projet
  const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
    interventions,
    usersMap
  );

  // Agrégations par technicien
  const statsMap = new Map<string, {
    nom: string;
    color: string;
    actif: boolean;
    universes: Map<string, { caHT: number; heures: number; dossiers: Set<string> }>;
  }>();

  // Variables de contrôle pour logs
  let totalFacturesNet = 0;
  let totalCAReparti = 0;
  let nbFacturesTraitees = 0;
  let nbAvoirsTraites = 0;

  // Traiter chaque facture
  factures.forEach((facture) => {
    // Utiliser le helper centralisé pour extraction unifiée
    const meta = extractFactureMeta(facture);

    // RÈGLE: Exclure les factures annulées
    if (facture.state === "canceled") return;

    // RÈGLE: Date valide requise
    if (!meta.date) return;

    // Filtrer par période si fournie
    if (dateRange) {
      if (!isWithinInterval(meta.date, { start: dateRange.start, end: dateRange.end })) {
        return;
      }
    }

    // RÈGLE CORRIGÉE: Ne plus ignorer les avoirs - les traiter comme montants négatifs
    // Un montant net de 0 n'apporte rien au calcul
    if (meta.montantNetHT === 0) return;

    const projectId = facture.projectId;
    if (!projectId) return;

    const project = projectsMap.get(projectId);
    if (!project) return;

    // Comptabiliser pour logs de contrôle
    totalFacturesNet += meta.montantNetHT;
    nbFacturesTraitees++;
    if (meta.isAvoir) nbAvoirsTraites++;

    // CA HT de la facture (signé : positif ou négatif pour avoir)
    const caFactureHT = meta.montantNetHT;

    // RÈGLE: Univers du projet avec normalisation
    const universesRaw: string[] = project.data?.universes || project.data?.univers || project.universes || project.univers || [];
    
    // Normaliser et filtrer les univers exclus
    const universes = universesRaw
      .map((u: string) => normalizeUniverseSlug(u))
      .filter((u: string) => !EXCLUDED_UNIVERSES.has(u));
    
    // RÈGLE: Si aucun univers exploitable, ignorer la facture
    if (universes.length === 0) return;

    const nbUniverses = universes.length;
    const projKey = String(projectId);

    // Durées par technicien sur ce projet
    const dureesParTech = dureeTechParProjet[projKey] || {};
    const dureeTotale = dureeTotaleParProjet[projKey] || 0;

    // RÈGLE: Si pas de temps productif attribué, ignorer
    if (dureeTotale === 0) return;

    // RÈGLE: Répartir le CA entre les techniciens proportionnellement à leur temps
    Object.keys(dureesParTech).forEach((techId) => {
      const dureeTech = dureesParTech[techId];
      const partTech = dureeTech / dureeTotale;
      const caTechFacture = caFactureHT * partTech;
      const heuresTech = dureeTech / 60;

      // Comptabiliser CA réparti
      totalCAReparti += caTechFacture;

      // Initialiser le technicien si nécessaire
      if (!statsMap.has(techId)) {
        const resolved = resolveTech(techId, TECHS);
        statsMap.set(techId, {
          nom: resolved.label,
          color: resolved.color,
          actif: resolved.actif,
          universes: new Map(),
        });
      }

      const tech = statsMap.get(techId)!;

      // RÈGLE: Répartir le CA et les heures entre les univers (prorata si multi-univers)
      universes.forEach((univers: string) => {
        if (!tech.universes.has(univers)) {
          tech.universes.set(univers, { caHT: 0, heures: 0, dossiers: new Set() });
        }

        const uniData = tech.universes.get(univers)!;
        uniData.caHT += caTechFacture / nbUniverses;
        uniData.heures += heuresTech / nbUniverses;
        uniData.dossiers.add(projKey);
      });
    });
  });

  // Convertir en tableau et calculer les totaux
  const result: TechUniversStats[] = [];

  statsMap.forEach((techData, techId) => {
    const universesData: TechUniversStats["universes"] = {};
    let totalCA = 0;
    let totalHeures = 0;
    const allDossiers = new Set<string>();

    techData.universes.forEach((data, univers) => {
      const caHT = Math.round(data.caHT * 100) / 100;
      const heures = Math.round(data.heures * 10) / 10;
      const caParHeure = heures > 0 ? Math.round(caHT / heures) : 0;
      const nbDossiers = data.dossiers.size;

      universesData[univers] = {
        caHT,
        heures,
        caParHeure,
        nbDossiers,
      };

      totalCA += caHT;
      totalHeures += heures;
      data.dossiers.forEach((d) => allDossiers.add(d));
    });

    result.push({
      technicienId: techId,
      technicienNom: techData.nom,
      technicienColor: techData.color,
      technicienActif: techData.actif,
      universes: universesData,
      totaux: {
        caHT: Math.round(totalCA * 100) / 100,
        heures: Math.round(totalHeures * 10) / 10,
        caParHeure: totalHeures > 0 ? Math.round(totalCA / totalHeures) : 0,
        nbDossiers: allDossiers.size,
      },
    });
  });

  // Calcul de l'écart pour le lissage
  const ecartBrut = totalFacturesNet - totalCAReparti;
  
  // P2-01: Logs conditionnels - uniquement en développement
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_STATIA === 'true') {
    console.log("[STATIA TECH] Contrôle cohérence CA (avant lissage):", {
      totalFacturesNet: Math.round(totalFacturesNet * 100) / 100,
      totalCAReparti: Math.round(totalCAReparti * 100) / 100,
      ecart: Math.round(ecartBrut * 100) / 100,
      nbFacturesTraitees,
      nbAvoirsTraites,
      nbTechniciens: result.length
    });
  }

  // RÈGLE DE LISSAGE : Répartir l'écart équitablement entre les techniciens
  // pour que le total CA techniciens = total CA factures net
  if (result.length > 0 && Math.abs(ecartBrut) > 0.01) {
    const ajustementParTech = ecartBrut / result.length;
    
    result.forEach((tech) => {
      // Répartir l'ajustement proportionnellement entre les univers du technicien
      const universKeys = Object.keys(tech.universes);
      if (universKeys.length === 0) return;
      
      const ajustementParUnivers = ajustementParTech / universKeys.length;
      
      universKeys.forEach((univers) => {
        tech.universes[univers].caHT += ajustementParUnivers;
        tech.universes[univers].caHT = Math.round(tech.universes[univers].caHT * 100) / 100;
        // Recalculer CA/heure
        tech.universes[univers].caParHeure = tech.universes[univers].heures > 0 
          ? Math.round(tech.universes[univers].caHT / tech.universes[univers].heures) 
          : 0;
      });
      
      // Recalculer les totaux du technicien
      tech.totaux.caHT += ajustementParTech;
      tech.totaux.caHT = Math.round(tech.totaux.caHT * 100) / 100;
      tech.totaux.caParHeure = tech.totaux.heures > 0 
        ? Math.round(tech.totaux.caHT / tech.totaux.heures) 
        : 0;
    });
    
    const nouveauTotal = result.reduce((sum, t) => sum + t.totaux.caHT, 0);
    // P2-01: Logs conditionnels - uniquement en développement
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_STATIA === 'true') {
      console.log("[STATIA TECH] Après lissage:", {
        ajustementParTech: Math.round(ajustementParTech * 100) / 100,
        nouveauTotalCATech: Math.round(nouveauTotal * 100) / 100,
        ecartResiduel: Math.round((totalFacturesNet - nouveauTotal) * 100) / 100
      });
    }
  }

  // Trier par CA total décroissant
  return result.sort((a, b) => b.totaux.caHT - a.totaux.caHT);
}

// ===============================
// AGRÉGATION MULTI-AGENCES
// ===============================

interface AgencyDataForStats {
  factures: any[];
  projects: any[];
  interventions: any[];
  users: any[];
  agenceSlug?: string;
  agenceLabel?: string;
}

/**
 * Agrège les stats Technicien × Univers sur plusieurs agences
 * Utilisé par FranchiseurStats pour le réseau
 */
export function aggregateTechUniversStatsMultiAgency(
  agenciesData: AgencyDataForStats[],
  dateRange?: { start: Date; end: Date }
): TechUniversStats[] {
  const techMap = new Map<string, TechUniversStats>();

  // Pour chaque agence, calculer les stats puis les agréger
  agenciesData.forEach((agencyData) => {
    const agencyStats = computeTechUniversStatsForAgency(
      agencyData.factures,
      agencyData.projects,
      agencyData.interventions,
      agencyData.users,
      dateRange
    );

    // Agréger avec les stats existantes
    agencyStats.forEach((stat) => {
      if (!techMap.has(stat.technicienId)) {
        // Nouveau technicien : copier tel quel avec info agence
        techMap.set(stat.technicienId, {
          ...stat,
          agenceSlug: agencyData.agenceSlug,
          agenceLabel: agencyData.agenceLabel,
          universes: { ...stat.universes },
          totaux: { ...stat.totaux },
        });
      } else {
        // Technicien existant : additionner
        const existing = techMap.get(stat.technicienId)!;

        // Agréger les univers
        Object.keys(stat.universes).forEach((univers) => {
          if (!existing.universes[univers]) {
            existing.universes[univers] = { caHT: 0, heures: 0, caParHeure: 0, nbDossiers: 0 };
          }
          existing.universes[univers].caHT += stat.universes[univers].caHT;
          existing.universes[univers].heures += stat.universes[univers].heures;
          existing.universes[univers].nbDossiers += stat.universes[univers].nbDossiers;
        });

        // Agréger les totaux
        existing.totaux.caHT += stat.totaux.caHT;
        existing.totaux.heures += stat.totaux.heures;
        existing.totaux.nbDossiers += stat.totaux.nbDossiers;
      }
    });
  });

  // Recalculer les caParHeure après agrégation
  techMap.forEach((tech) => {
    // Totaux
    tech.totaux.caHT = Math.round(tech.totaux.caHT * 100) / 100;
    tech.totaux.heures = Math.round(tech.totaux.heures * 10) / 10;
    tech.totaux.caParHeure = tech.totaux.heures > 0
      ? Math.round(tech.totaux.caHT / tech.totaux.heures)
      : 0;

    // Par univers
    Object.keys(tech.universes).forEach((univers) => {
      const u = tech.universes[univers];
      u.caHT = Math.round(u.caHT * 100) / 100;
      u.heures = Math.round(u.heures * 10) / 10;
      u.caParHeure = u.heures > 0 ? Math.round(u.caHT / u.heures) : 0;
    });
  });

  const result = Array.from(techMap.values()).sort((a, b) => b.totaux.caHT - a.totaux.caHT);
  
  // Log de contrôle réseau franchiseur
  const totalCATechReseau = result.reduce((sum, t) => sum + t.totaux.caHT, 0);
  const totalHeuresReseau = result.reduce((sum, t) => sum + t.totaux.heures, 0);
  const totalDossiersReseau = result.reduce((sum, t) => sum + t.totaux.nbDossiers, 0);
  
  if (import.meta.env.DEV) {
    logDebug("[STATIA RESEAU] Stats agrégées multi-agences:", {
      nbAgences: agenciesData.length,
      nbTechniciens: result.length,
      totalCATechReseau: Math.round(totalCATechReseau * 100) / 100,
      totalHeuresReseau: Math.round(totalHeuresReseau * 10) / 10,
      totalDossiersReseau,
      caParHeureReseau: totalHeuresReseau > 0 
        ? Math.round(totalCATechReseau / totalHeuresReseau) 
        : 0
    });
  }

  return result;
}
