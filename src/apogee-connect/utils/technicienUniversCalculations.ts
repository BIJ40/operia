import { parseISO, isWithinInterval } from "date-fns";

export interface TechnicienUniversStats {
  technicienId: string;
  technicienNom: string;
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

    // Exclure les relevés techniques
    const isRT =
      intervention.data?.biRt?.isValidated === true ||
      intervention.data?.type2 === "RT";
    if (isRT) return;

    // Vérifier que c'est une intervention éligible (dépannage ou travaux)
    const isEligible =
      intervention.data?.biDepan || intervention.data?.biTvx;
    if (!isEligible) return;

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

  // Map des projets pour accès rapide
  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  // Agrégations par technicien et univers
  const stats: {
    [techId: string]: {
      nom: string;
      universes: {
        [universSlug: string]: {
          caHT: number;
          heures: number;
          nbDossiers: Set<string>;
        };
      };
    };
  } = {};

  // Filtrer les factures par période
  const filteredFactures = factures.filter((facture) => {
    const dateReelle = facture.dateReelle;
    if (!dateReelle) return false;

    try {
      const factureDate = parseISO(dateReelle);
      return isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });

  // Traiter chaque facture
  filteredFactures.forEach((facture) => {
    // Exclure les factures annulées
    if (facture.state === "canceled") return;

    const projectId = facture.projectId;
    if (!projectId) return;

    const project = projectsMap.get(projectId);
    if (!project) return;

    // CA de la facture
    const caFactureHT = Number(facture.data?.totalHT || facture.totalHT || 0);
    if (caFactureHT <= 0) return;

    // Univers du projet
    const universes = project.data?.universes || [];
    if (universes.length === 0) return;

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
        const user = users.find((u) => u.id === techId);
        const userData = user?.data || user;
        const firstname = userData?.firstname || user?.firstname || '';
        const name = userData?.name || user?.name || '';
        const displayName = firstname && name ? `${firstname} ${name}` : name || firstname || `Technicien ${techId.slice(0, 8)}`;
        
        stats[techId] = {
          nom: displayName,
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
