import { isWithinInterval } from "date-fns";
import { 
  buildTechMap, 
  resolveTech, 
  normalizeIsOn, 
  isExcludedUserType 
} from "./techTools";
import { extractFactureMeta } from "@/statia/rules/rules";
import { RT_TYPES, TH_TYPES, SPECIAL_PRODUCTIVE_TYPE2 } from "@/statia/domain/rules";

/**
 * Normaliser les slugs d'univers de l'API vers nos labels
 * Table de correspondance HARD-CODÉE (identique à enrichmentService)
 */
const normalizeUniverseSlug = (slug: string): string => {
  const normalizationMap: Record<string, string> = {
    'amelioration_logement': 'pmr',
    'amelioration-logement': 'pmr',
    'ame_logement': 'pmr',
    'volets': 'volet_roulant',
    'volet': 'volet_roulant',
  };

  const normalized = normalizationMap[slug.toLowerCase()];
  return normalized || slug.toLowerCase();
};

export interface TechnicienUniversStats {
  technicienId: string;
  technicienNom: string;
  technicienColor: string;
  technicienActif: boolean;
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

/**
 * Calcule le temps passé par chaque technicien sur chaque projet
 * en excluant les interventions RT et en ne comptant que les visites validées
 */
function calculateTechTimeByProject(
  interventions: any[],
  projects: any[]
): { dureeTechParProjet: DureeTechParProjet; dureeTotaleParProjet: DureeTotaleParProjet } {
  const dureeTechParProjet: DureeTechParProjet = {};
  const dureeTotaleParProjet: DureeTotaleParProjet = {};

  interventions.forEach((intervention) => {
    const projectId = intervention.projectId || intervention.refProjectId;
    if (!projectId) return;

    // Extraction des types pour les règles
    const type2Raw = (intervention.type2 || intervention.data?.type2 || "");
    const type2Lower = type2Raw.toLowerCase().trim();
    const typeRaw = (intervention.type || intervention.data?.type || "").toLowerCase().trim();

    // ============================================
    // RÈGLE: Exclure les RT (Relevés Techniques)
    // ============================================
    const isRTExplicit = RT_TYPES.some(rt => 
      type2Lower === rt.toLowerCase() || 
      typeRaw === rt.toLowerCase() ||
      type2Lower.includes(rt.toLowerCase())
    );
    
    const hasBiRt = intervention.data?.biRt?.isValidated === true;
    const hasBiDepan = intervention.data?.biDepan;
    const hasBiTvx = intervention.data?.biTvx;
    const isRTViaBi = hasBiRt && !hasBiDepan && !hasBiTvx;
    
    if (isRTExplicit || isRTViaBi) return;

    // ============================================
    // RÈGLE: Exclure les TH (Taux d'Humidité)
    // ============================================
    const isTH = TH_TYPES.some(th => 
      type2Lower === th.toLowerCase() || 
      typeRaw === th.toLowerCase() ||
      type2Lower.includes(th.toLowerCase())
    );
    if (isTH) return;

    // ============================================
    // RÈGLE: Exclure les SAV (égalité stricte)
    // ============================================
    const isSAV = type2Lower === "sav" || typeRaw === "sav";
    if (isSAV) return;

    // ============================================
    // RÈGLE: "Recherche de fuite" = TOUJOURS productif
    // ============================================
    const isRechercheFuite = SPECIAL_PRODUCTIVE_TYPE2.some(rf => 
      type2Lower.includes(rf.toLowerCase()) || 
      typeRaw.includes(rf.toLowerCase())
    );

    // RÈGLE: Types productifs (biDepan ou biTvx requis, SAUF recherche de fuite)
    const isProductive = hasBiDepan || hasBiTvx || isRechercheFuite;
    if (!isProductive) return;

    // Initialiser le projet si nécessaire
    if (!dureeTechParProjet[projectId]) {
      dureeTechParProjet[projectId] = {};
      dureeTotaleParProjet[projectId] = 0;
    }

    // Parcourir les visites validées
    const visites = intervention.data?.visites || [];
    visites.forEach((visite: any) => {
      if (visite.state !== "validated") return;

      const duree = Number(visite.duree) || 0;
      const usersIds = visite.usersIds || [];

      usersIds.forEach((techId: string) => {
        if (!dureeTechParProjet[projectId][techId]) {
          dureeTechParProjet[projectId][techId] = 0;
        }
        // Chaque technicien compte la durée complète de la visite
        dureeTechParProjet[projectId][techId] += duree;
        dureeTotaleParProjet[projectId] += duree;
      });
    });
  });

  return { dureeTechParProjet, dureeTotaleParProjet };
}

/**
 * Calcule les statistiques CA et heures par technicien et par univers
 */
export function calculateTechnicienUniversStats(
  factures: any[],
  projects: any[],
  interventions: any[],
  users: any[],
  dateRange: { start: Date; end: Date }
): TechnicienUniversStats[] {
  const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
    interventions,
    projects
  );

  // Construire le dictionnaire des techniciens
  const TECHS = buildTechMap(users);

  // Map des projets pour accès rapide
  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  // Agrégations par technicien et univers
  const stats: {
    [techId: string]: {
      nom: string;
      color: string;
      actif: boolean;
      universes: {
        [universSlug: string]: {
          caHT: number;
          heures: number;
          nbDossiers: Set<string>;
        };
      };
    };
  } = {};

  // Filtrer les factures par période via extractFactureMeta
  const filteredFactures = factures.filter((facture) => {
    const meta = extractFactureMeta(facture);
    if (!meta.date) return false;

    return isWithinInterval(meta.date, { start: dateRange.start, end: dateRange.end });
  });

  // Traiter chaque facture
  filteredFactures.forEach((facture) => {
    // Utiliser le helper centralisé
    const meta = extractFactureMeta(facture);
    
    // Exclure les factures annulées
    if (facture.state === "canceled") return;

    const projectId = facture.projectId;
    if (!projectId) return;

    const project = projectsMap.get(projectId);
    if (!project) return;

    // CORRECTION: Ne plus ignorer les avoirs, utiliser montantNet (signé)
    const caFactureHT = meta.montantNetHT;
    if (caFactureHT === 0) return;

    // Univers du projet - NORMALISER les slugs
    const universesRaw = project.data?.universes || [];
    if (universesRaw.length === 0) return;

    const universes = universesRaw.map((u: string) => normalizeUniverseSlug(u));
    const nbUniverses = universes.length;

    // Durées par technicien sur ce projet
    const dureesParTech = dureeTechParProjet[projectId] || {};
    const dureeTotale = dureeTotaleParProjet[projectId] || 0;

    if (dureeTotale === 0) return;

    // Répartir le CA entre les techniciens proportionnellement à leur temps
    Object.keys(dureesParTech).forEach((techId) => {
      const dureeTech = dureesParTech[techId];
      const partTech = dureeTech / dureeTotale;
      const caTechFacture = caFactureHT * partTech;

      // Initialiser le technicien si nécessaire
      if (!stats[techId]) {
        const resolved = resolveTech(techId, TECHS);
        
        stats[techId] = {
          nom: resolved.label,
          color: resolved.color,
          actif: resolved.actif,
          universes: {},
        };
      }

      // Répartir le CA et les heures entre les univers
      universes.forEach((univers: string) => {
        if (!stats[techId].universes[univers]) {
          stats[techId].universes[univers] = {
            caHT: 0,
            heures: 0,
            nbDossiers: new Set(),
          };
        }

        const caParUnivers = caTechFacture / nbUniverses;
        const heuresParUnivers = (dureeTech / 60) / nbUniverses;

        stats[techId].universes[univers].caHT += caParUnivers;
        stats[techId].universes[univers].heures += heuresParUnivers;
        stats[techId].universes[univers].nbDossiers.add(projectId);
      });
    });
  });

  // Convertir en tableau et calculer les totaux
  const result: TechnicienUniversStats[] = Object.keys(stats).map((techId) => {
    const techData = stats[techId];
    
    const universesData: {
      [universSlug: string]: {
        caHT: number;
        heures: number;
        caParHeure: number;
        nbDossiers: number;
      };
    } = {};

    let totalCA = 0;
    let totalHeures = 0;
    let totalDossiers = new Set<string>();

    Object.keys(techData.universes).forEach((univers) => {
      const data = techData.universes[univers];
      const caHT = data.caHT;
      const heures = data.heures;
      const caParHeure = heures > 0 ? caHT / heures : 0;
      const nbDossiers = data.nbDossiers.size;

      universesData[univers] = {
        caHT,
        heures,
        caParHeure,
        nbDossiers,
      };

      totalCA += caHT;
      totalHeures += heures;
      data.nbDossiers.forEach((d) => totalDossiers.add(d));
    });

    return {
      technicienId: techId,
      technicienNom: techData.nom,
      technicienColor: techData.color,
      technicienActif: techData.actif,
      universes: universesData,
      totaux: {
        caHT: totalCA,
        heures: totalHeures,
        caParHeure: totalHeures > 0 ? totalCA / totalHeures : 0,
        nbDossiers: totalDossiers.size,
      },
    };
  });

  // Trier par CA total décroissant
  return result.sort((a, b) => b.totaux.caHT - a.totaux.caHT);
}
