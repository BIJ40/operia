import { parseISO, isWithinInterval, format } from "date-fns";
import { fr } from "date-fns/locale";

// ====================================================================
// INTERFACES
// ====================================================================

export interface SAVGlobalStats {
  nbTotalProjects: number;
  nbSAVProjects: number;
  tauxSAV: number;
  nbInterventionsSAV: number;
  caSAV: number;
}

export interface SAVByTypeApporteur {
  type: string;
  nbProjects: number;
  nbSAVProjects: number;
  tauxSAV: number;
  caSAV: number;
}

export interface SAVByTechnicien {
  technicienId: string;
  technicienNom: string;
  nbInterventionsSAV: number;
  nbProjectsSAV: number;
  heuresSAV: number;
  caSAV: number;
}

export interface SAVByUnivers {
  univers: string;
  nbProjectsSAV: number;
  tauxSAV: number;
  caSAV: number;
}

export interface SAVByApporteur {
  apporteurId: number;
  apporteurNom: string;
  type: string;
  nbProjectsSAV: number;
  tauxSAV: number;
  caSAV: number;
}

export interface SAVMonthlyEvolution {
  month: string;
  nbSAV: number;
  tauxSAV: number;
  caSAV: number;
}

// ====================================================================
// FONCTIONS UTILITAIRES
// ====================================================================

/**
 * Détermine si un projet est un SAV basé sur les interventions et les flags projet
 */
const isProjectSAV = (
  projectId: number,
  interventions: any[],
  project: any
): boolean => {
  // Vérifier via interventions
  const hasSAVIntervention = interventions.some(interv => {
    if (interv.projectId !== projectId) return false;
    const pictos = interv.data?.pictosInterv ?? [];
    const type2 = interv.data?.type2 ?? null;
    return pictos.includes("SAV") || type2 === "SAV";
  });

  if (hasSAVIntervention) return true;

  // Vérifier via drapeaux projet
  const picto = project?.data?.pictoInterv ?? [];
  const sinistre = project?.data?.sinistre ?? null;
  return picto.includes("SAV") || sinistre === "SAV";
};

/**
 * Trouve le dernier technicien intervenu sur un projet SAV
 */
const getLastTechnicianForProject = (
  projectId: number,
  interventions: any[]
): string | null => {
  // Filtrer et trier les interventions du projet par date décroissante
  const projectInterventions = interventions
    .filter(i => i.projectId === projectId && i.date)
    .sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return dateB.getTime() - dateA.getTime(); // Plus récent d'abord
      } catch {
        return 0;
      }
    });

  if (projectInterventions.length === 0) return null;

  // Récupérer le userId de la dernière intervention
  const lastIntervention = projectInterventions[0];
  return lastIntervention.userId || null;
};

/**
 * Extrait le CA d'un projet via ses factures
 */
const getProjectCA = (
  projectId: number,
  factures: any[],
  dateRange?: { start: Date; end: Date }
): number => {
  let ca = 0;

  factures.forEach(facture => {
    if (facture.projectId !== projectId) return;

    // Exclure les avoirs
    const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
    if (typeFacture === "avoir") return;

    // Filtrer par période si fournie
    if (dateRange) {
      const dateFacture = facture.dateEmission || facture.dateReelle || facture.created_at;
      if (!dateFacture) return;

      try {
        const factureDate = parseISO(dateFacture);
        if (!isWithinInterval(factureDate, dateRange)) return;
      } catch {
        return;
      }
    }

    // Extraire montant HT
    const montantRaw = facture.montantHT || facture.data?.montantHT || facture.data?.totalHT || facture.totalHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));

    if (!isNaN(montant)) {
      ca += montant;
    }
  });

  return ca;
};

// ====================================================================
// CALCULS KPI GLOBAUX SAV
// ====================================================================

export const calculateSAVGlobalStats = (
  projects: any[],
  interventions: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): SAVGlobalStats => {
  const projectsInPeriod = projects.filter(p => {
    const dateCreation = p.created_at || p.createdAt;
    if (!dateCreation) return false;

    try {
      const projectDate = parseISO(dateCreation);
      return isWithinInterval(projectDate, dateRange);
    } catch {
      return false;
    }
  });

  let nbSAVProjects = 0;
  let nbInterventionsSAV = 0;
  let caSAV = 0;

  projectsInPeriod.forEach(project => {
    const isSAV = isProjectSAV(project.id, interventions, project);

    if (isSAV) {
      nbSAVProjects++;
      caSAV += getProjectCA(project.id, factures, dateRange);

      // Compter les interventions SAV du projet
      interventions.forEach(interv => {
        if (interv.projectId === project.id) {
          const pictos = interv.data?.pictosInterv ?? [];
          const type2 = interv.data?.type2 ?? null;
          if (pictos.includes("SAV") || type2 === "SAV") {
            nbInterventionsSAV++;
          }
        }
      });
    }
  });

  const nbTotalProjects = projectsInPeriod.length;
  const tauxSAV = nbTotalProjects > 0 ? (nbSAVProjects / nbTotalProjects) * 100 : 0;

  return {
    nbTotalProjects,
    nbSAVProjects,
    tauxSAV: Math.round(tauxSAV * 10) / 10,
    nbInterventionsSAV,
    caSAV,
  };
};

// ====================================================================
// SAV PAR TYPE APPORTEUR
// ====================================================================

export const calculateSAVByTypeApporteur = (
  projects: any[],
  clients: any[],
  interventions: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): SAVByTypeApporteur[] => {
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const statsParType = new Map<string, { total: number; sav: number; ca: number }>();

  projects.forEach(project => {
    // Filtrer par période
    const dateCreation = project.created_at || project.createdAt;
    if (!dateCreation) return;

    try {
      const projectDate = parseISO(dateCreation);
      if (!isWithinInterval(projectDate, dateRange)) return;
    } catch {
      return;
    }

    // Identifier le type d'apporteur
    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    let type = "Particulier";

    if (commanditaireId) {
      const client = clientsMap.get(commanditaireId);
      type = client?.data?.type || "Non défini";
    }

    // Initialiser les stats si nécessaire
    if (!statsParType.has(type)) {
      statsParType.set(type, { total: 0, sav: 0, ca: 0 });
    }

    const stats = statsParType.get(type)!;
    stats.total++;

    const isSAV = isProjectSAV(project.id, interventions, project);
    if (isSAV) {
      stats.sav++;
      stats.ca += getProjectCA(project.id, factures, dateRange);
    }
  });

  const result: SAVByTypeApporteur[] = [];

  statsParType.forEach((stats, type) => {
    const tauxSAV = stats.total > 0 ? (stats.sav / stats.total) * 100 : 0;

    result.push({
      type,
      nbProjects: stats.total,
      nbSAVProjects: stats.sav,
      tauxSAV: Math.round(tauxSAV * 10) / 10,
      caSAV: stats.ca,
    });
  });

  return result.sort((a, b) => b.tauxSAV - a.tauxSAV);
};

// ====================================================================
// SAV PAR TECHNICIEN (dernier intervenu = responsable)
// ====================================================================

export const calculateSAVByTechnicien = (
  projects: any[],
  interventions: any[],
  factures: any[],
  users: any[],
  dateRange: { start: Date; end: Date }
): SAVByTechnicien[] => {
  const usersMap = new Map(users.map(u => [u.id, u]));
  const statsParTech = new Map<string, { nbInterventions: number; projects: Set<number>; heures: number; ca: number }>();

  // Identifier tous les projets SAV dans la période
  const savProjects = new Set<number>();

  projects.forEach(project => {
    const dateCreation = project.created_at || project.createdAt;
    if (!dateCreation) return;

    try {
      const projectDate = parseISO(dateCreation);
      if (!isWithinInterval(projectDate, dateRange)) return;
    } catch {
      return;
    }

    if (isProjectSAV(project.id, interventions, project)) {
      savProjects.add(project.id);
    }
  });

  // Pour chaque projet SAV, attribuer au dernier technicien
  savProjects.forEach(projectId => {
    const lastTechId = getLastTechnicianForProject(projectId, interventions);
    if (!lastTechId) return;

    if (!statsParTech.has(lastTechId)) {
      statsParTech.set(lastTechId, { nbInterventions: 0, projects: new Set(), heures: 0, ca: 0 });
    }

    const stats = statsParTech.get(lastTechId)!;
    stats.projects.add(projectId);
    stats.ca += getProjectCA(projectId, factures, dateRange);

    // Compter les interventions SAV et heures
    interventions.forEach(interv => {
      if (interv.projectId !== projectId) return;

      const pictos = interv.data?.pictosInterv ?? [];
      const type2 = interv.data?.type2 ?? null;

      if (pictos.includes("SAV") || type2 === "SAV") {
        stats.nbInterventions++;

        // Extraire les heures
        const heures = interv.data?.heures || interv.duree || 0;
        const heuresNum = parseFloat(String(heures).replace(/[^0-9.-]/g, ''));
        if (!isNaN(heuresNum)) {
          stats.heures += heuresNum;
        }
      }
    });
  });

  const result: SAVByTechnicien[] = [];

  statsParTech.forEach((stats, techId) => {
    const user = usersMap.get(techId);
    const nom = user ? `${user.firstname || ""} ${user.name || ""}`.trim() : "Technicien inconnu";

    result.push({
      technicienId: techId,
      technicienNom: nom,
      nbInterventionsSAV: stats.nbInterventions,
      nbProjectsSAV: stats.projects.size,
      heuresSAV: Math.round(stats.heures * 10) / 10,
      caSAV: stats.ca,
    });
  });

  return result.sort((a, b) => b.nbProjectsSAV - a.nbProjectsSAV);
};

// ====================================================================
// SAV PAR UNIVERS
// ====================================================================

export const calculateSAVByUnivers = (
  projects: any[],
  interventions: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): SAVByUnivers[] => {
  const statsParUnivers = new Map<string, { total: number; sav: number; ca: number }>();

  projects.forEach(project => {
    const dateCreation = project.created_at || project.createdAt;
    if (!dateCreation) return;

    try {
      const projectDate = parseISO(dateCreation);
      if (!isWithinInterval(projectDate, dateRange)) return;
    } catch {
      return;
    }

    const universes = project.data?.universes || [];
    if (universes.length === 0) universes.push("Non défini");

    const isSAV = isProjectSAV(project.id, interventions, project);
    const ca = isSAV ? getProjectCA(project.id, factures, dateRange) : 0;

    universes.forEach((univers: string) => {
      if (!statsParUnivers.has(univers)) {
        statsParUnivers.set(univers, { total: 0, sav: 0, ca: 0 });
      }

      const stats = statsParUnivers.get(univers)!;
      stats.total++;

      if (isSAV) {
        stats.sav++;
        // Répartir le CA équitablement entre les univers
        stats.ca += ca / universes.length;
      }
    });
  });

  const result: SAVByUnivers[] = [];

  statsParUnivers.forEach((stats, univers) => {
    const tauxSAV = stats.total > 0 ? (stats.sav / stats.total) * 100 : 0;

    result.push({
      univers,
      nbProjectsSAV: stats.sav,
      tauxSAV: Math.round(tauxSAV * 10) / 10,
      caSAV: stats.ca,
    });
  });

  return result.sort((a, b) => b.tauxSAV - a.tauxSAV);
};

// ====================================================================
// SAV PAR APPORTEUR (liste détaillée)
// ====================================================================

export const calculateSAVByApporteur = (
  projects: any[],
  clients: any[],
  interventions: any[],
  factures: any[],
  dateRange: { start: Date; end: Date }
): SAVByApporteur[] => {
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const statsParApporteur = new Map<number, { nom: string; type: string; total: number; sav: number; ca: number }>();

  projects.forEach(project => {
    const dateCreation = project.created_at || project.createdAt;
    if (!dateCreation) return;

    try {
      const projectDate = parseISO(dateCreation);
      if (!isWithinInterval(projectDate, dateRange)) return;
    } catch {
      return;
    }

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!commanditaireId) return; // Exclure particuliers

    const client = clientsMap.get(commanditaireId);
    if (!client) return;

    const nom = client.raisonSociale || client.nom || "Apporteur inconnu";
    const type = client.data?.type || "Non défini";

    if (!statsParApporteur.has(commanditaireId)) {
      statsParApporteur.set(commanditaireId, { nom, type, total: 0, sav: 0, ca: 0 });
    }

    const stats = statsParApporteur.get(commanditaireId)!;
    stats.total++;

    const isSAV = isProjectSAV(project.id, interventions, project);
    if (isSAV) {
      stats.sav++;
      stats.ca += getProjectCA(project.id, factures, dateRange);
    }
  });

  const result: SAVByApporteur[] = [];

  statsParApporteur.forEach((stats, apporteurId) => {
    const tauxSAV = stats.total > 0 ? (stats.sav / stats.total) * 100 : 0;

    result.push({
      apporteurId,
      apporteurNom: stats.nom,
      type: stats.type,
      nbProjectsSAV: stats.sav,
      tauxSAV: Math.round(tauxSAV * 10) / 10,
      caSAV: stats.ca,
    });
  });

  return result.sort((a, b) => b.nbProjectsSAV - a.nbProjectsSAV);
};

// ====================================================================
// ÉVOLUTION MENSUELLE DES SAV
// ====================================================================

export const calculateSAVMonthlyEvolution = (
  projects: any[],
  interventions: any[],
  factures: any[],
  year: number
): SAVMonthlyEvolution[] => {
  const monthlyData: SAVMonthlyEvolution[] = Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(year, monthIndex, 1);
    return {
      month: format(date, "MMM", { locale: fr }),
      nbSAV: 0,
      tauxSAV: 0,
      caSAV: 0,
    };
  });

  const monthlyTotal = Array(12).fill(0);

  projects.forEach(project => {
    const dateCreation = project.created_at || project.createdAt;
    if (!dateCreation) return;

    try {
      const projectDate = parseISO(dateCreation);
      if (projectDate.getFullYear() !== year) return;

      const monthIndex = projectDate.getMonth();
      monthlyTotal[monthIndex]++;

      const isSAV = isProjectSAV(project.id, interventions, project);
      if (isSAV) {
        monthlyData[monthIndex].nbSAV++;
        monthlyData[monthIndex].caSAV += getProjectCA(project.id, factures);
      }
    } catch {
      return;
    }
  });

  // Calculer les taux
  monthlyData.forEach((data, index) => {
    if (monthlyTotal[index] > 0) {
      data.tauxSAV = Math.round((data.nbSAV / monthlyTotal[index]) * 1000) / 10;
    }
  });

  return monthlyData;
};
