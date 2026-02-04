import { isWithinInterval } from "date-fns";
import { 
  buildTechMap, 
  resolveTech, 
  normalizeIsOn, 
  isExcludedUserType,
  TechnicienInfo
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
 * Vérifie si un utilisateur est un technicien actif (non commercial/admin)
 */
function isActiveTechnician(user: any, TECHS: Record<number, TechnicienInfo>): boolean {
  if (!user) return false;
  
  // RÈGLE 1: Exclure les types non-techniciens (commercial, admin, etc.)
  const userType = (user?.type || '').toString();
  if (isExcludedUserType(userType)) return false;
  
  // RÈGLE 2: L'utilisateur doit être dans le dictionnaire TECHS
  const userId = typeof user === 'number' ? user : user?.id;
  if (userId && TECHS[userId]) {
    return TECHS[userId].actif;
  }
  
  // Si pas dans TECHS, vérifier manuellement
  const hasUniverses = 
    (Array.isArray(user?.data?.universes) && user.data.universes.length > 0) ||
    (Array.isArray(user?.universes) && user.universes.length > 0);
  
  const isTechnicien =
    user?.isTechnicien === true ||
    user?.isTechnicien === 1 ||
    user?.type === "technicien" ||
    userType.toLowerCase() === "technicien" ||
    (user?.type === "utilisateur" && hasUniverses) ||
    (userType.toLowerCase() === "utilisateur" && hasUniverses);

  const isActive = normalizeIsOn(user?.is_on) || normalizeIsOn(user?.isActive);

  return isTechnicien && isActive;
}

/**
 * Calcule le temps passé par chaque technicien sur chaque projet
 * en excluant les interventions RT et en ne comptant que les visites validées
 * 
 * RÈGLE AJOUTÉE: Exclure les utilisateurs non-techniciens (commercial, admin, etc.)
 */
function calculateTechTimeByProject(
  interventions: any[],
  projects: any[],
  usersMap: Map<number, any>,
  TECHS: Record<number, TechnicienInfo>
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
      if (duree <= 0) return;
      
      const usersIds: number[] = visite.usersIds || [];

      // ============================================
      // RÈGLE CRITIQUE: Ne compter que les VRAIS techniciens
      // Exclure commercial, admin, assistant, administratif
      // ============================================
      const technicienIds = usersIds.filter((userId: number) => {
        const user = usersMap.get(userId);
        return isActiveTechnician(user, TECHS);
      });

      // Si aucun technicien sur cette visite, ignorer
      if (technicienIds.length === 0) return;

      technicienIds.forEach((techId: number) => {
        const techKey = String(techId);
        if (!dureeTechParProjet[projectId][techKey]) {
          dureeTechParProjet[projectId][techKey] = 0;
        }
        // Chaque technicien compte la durée complète de la visite
        dureeTechParProjet[projectId][techKey] += duree;
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
  // Construire le dictionnaire des techniciens AVANT le calcul des temps
  const TECHS = buildTechMap(users);
  
  // Créer une map des utilisateurs pour le filtrage
  const usersMap = new Map<number, any>(users.map((u) => [u.id, u]));

  // Calculer les temps avec le filtre sur les types utilisateurs
  const { dureeTechParProjet, dureeTotaleParProjet } = calculateTechTimeByProject(
    interventions,
    projects,
    usersMap,
    TECHS
  );

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
