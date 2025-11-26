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
 * Détermine si un projet est un SAV basé sur les interventions
 * IMPORTANT: Utilise la même logique que la page Accueil pour cohérence
 */
const isProjectSAV = (
  projectId: number,
  interventions: any[],
  project: any
): boolean => {
  // Vérifier via interventions avec la même logique que calculateTauxSAVGlobal
  const hasSAVIntervention = interventions.some(interv => {
    if (interv.projectId !== projectId) return false;
    
    const type2 = interv.type2 || interv.data?.type2 || "";
    const type = interv.type || interv.data?.type || "";
    
    // Utilise .includes() avec minuscules comme dans apporteursCalculations.ts
    return type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
  });

  return hasSAVIntervention;
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
 * IMPORTANT: Applique un coefficient de 35% car un SAV coûte en moyenne 35% de la facture
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
      // Appliquer le coefficient 35% pour le coût SAV
      ca += montant * 0.35;
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
  console.log("[SAV Global] === Début du calcul ===");
  
  // NOUVELLE LOGIQUE: Base sur les INTERVENTIONS, pas sur les FACTURES
  // 1. Filtrer les interventions sur la période
  const interventionsPeriode = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, dateRange);
    } catch {
      return false;
    }
  });

  console.log(`[SAV Global] Interventions dans la période: ${interventionsPeriode.length}`);

  // 2. Identifier TOUS les dossiers actifs (avec au moins 1 intervention)
  const dossiersActifs = new Set<number>();
  interventionsPeriode.forEach(interv => {
    if (interv.projectId) {
      dossiersActifs.add(interv.projectId);
    }
  });

  console.log(`[SAV Global] Dossiers actifs (avec interventions): ${dossiersActifs.size}`);

  // 3. Identifier les dossiers avec SAV et compter les interventions SAV
  const dossiersSAV = new Set<number>();
  let nbInterventionsSAV = 0;
  
  interventionsPeriode.forEach(interv => {
    const type2 = interv.type2 || interv.data?.type2 || "";
    const type = interv.type || interv.data?.type || "";
    
    const isSav = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
    
    if (isSav) {
      dossiersSAV.add(interv.projectId);
      nbInterventionsSAV++;
    }
  });

  console.log(`[SAV Global] Dossiers avec SAV: ${dossiersSAV.size}`);
  console.log(`[SAV Global] Interventions SAV: ${nbInterventionsSAV}`);

  // 4. Calculer le CA SAV (en utilisant les factures disponibles)
  let caSAV = 0;
  dossiersSAV.forEach(projectId => {
    caSAV += getProjectCA(projectId, factures, dateRange);
  });

  console.log(`[SAV Global] CA SAV: ${caSAV.toFixed(2)} €`);

  const nbTotalProjects = dossiersActifs.size;
  const tauxSAV = nbTotalProjects > 0 ? (dossiersSAV.size / nbTotalProjects) * 100 : 0;

  console.log(`[SAV Global] Taux SAV: ${tauxSAV.toFixed(1)}% (${dossiersSAV.size} / ${nbTotalProjects})`);

  return {
    nbTotalProjects,
    nbSAVProjects: dossiersSAV.size,
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
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const statsParType = new Map<string, { total: number; sav: number; ca: number }>();

  // 1. Filtrer les interventions sur la période pour identifier les dossiers actifs
  const interventionsPeriode = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, dateRange);
    } catch {
      return false;
    }
  });

  const dossiersActifs = new Set<number>();
  interventionsPeriode.forEach(interv => {
    if (interv.projectId) dossiersActifs.add(interv.projectId);
  });

  // 2. Pour chaque dossier actif, identifier le type d'apporteur
  dossiersActifs.forEach(projectId => {
    const project = projectsMap.get(projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    let type = "Particulier";

    if (commanditaireId) {
      const client = clientsMap.get(commanditaireId);
      type = client?.data?.type || "Non défini";
    }

    if (!statsParType.has(type)) {
      statsParType.set(type, { total: 0, sav: 0, ca: 0 });
    }

    const stats = statsParType.get(type)!;
    stats.total++;

    const isSAV = isProjectSAV(projectId, interventions, project);
    if (isSAV) {
      stats.sav++;
      stats.ca += getProjectCA(projectId, factures, dateRange);
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
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const statsParTech = new Map<string, { nbInterventions: number; projects: Set<number>; heures: number; ca: number }>();

  console.log("[SAV Technicien] Nombre de users:", users.length);
  console.log("[SAV Technicien] Nombre de projets:", projects.length);
  console.log("[SAV Technicien] Nombre d'interventions:", interventions.length);

  // 1. Filtrer les interventions sur la période pour identifier les dossiers actifs
  const interventionsPeriode = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, dateRange);
    } catch {
      return false;
    }
  });

  const dossiersActifs = new Set<number>();
  interventionsPeriode.forEach(interv => {
    if (interv.projectId) dossiersActifs.add(interv.projectId);
  });

  // 2. Identifier les projets SAV parmi les dossiers actifs
  const savProjects = new Set<number>();
  dossiersActifs.forEach(projectId => {
    const project = projectsMap.get(projectId);
    if (!project) return;
    
    if (isProjectSAV(projectId, interventions, project)) {
      savProjects.add(projectId);
    }
  });

  console.log("[SAV Technicien] Projets SAV identifiés:", savProjects.size);

  // 3. Pour chaque projet SAV, attribuer au dernier technicien
  savProjects.forEach(projectId => {
    const lastTechId = getLastTechnicianForProject(projectId, interventions);
    
    if (!lastTechId) {
      console.warn(`[SAV Technicien] Aucun technicien trouvé pour projet ${projectId}`);
      return;
    }

    if (!statsParTech.has(lastTechId)) {
      statsParTech.set(lastTechId, { nbInterventions: 0, projects: new Set(), heures: 0, ca: 0 });
    }

    const stats = statsParTech.get(lastTechId)!;
    stats.projects.add(projectId);
    stats.ca += getProjectCA(projectId, factures, dateRange);

    // Compter les interventions SAV et heures (utiliser la même détection)
    interventions.forEach(interv => {
      if (interv.projectId !== projectId) return;

      const type2 = interv.type2 || interv.data?.type2 || "";
      const type = interv.type || interv.data?.type || "";
      const isSav = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");

      if (isSav) {
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

  console.log("[SAV Technicien] Nombre de techniciens avec SAV:", statsParTech.size);

  const result: SAVByTechnicien[] = [];

  statsParTech.forEach((stats, techId) => {
    const user = usersMap.get(techId);
    const nom = user ? `${user.firstname || ""} ${user.name || ""}`.trim() : "Technicien inconnu";

    console.log(`[SAV Technicien] ${nom}: ${stats.projects.size} projets, ${stats.nbInterventions} interventions`);

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
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const statsParUnivers = new Map<string, { total: number; sav: number; ca: number }>();

  // 1. Filtrer les interventions sur la période pour identifier les dossiers actifs
  const interventionsPeriode = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, dateRange);
    } catch {
      return false;
    }
  });

  const dossiersActifs = new Set<number>();
  interventionsPeriode.forEach(interv => {
    if (interv.projectId) dossiersActifs.add(interv.projectId);
  });

  // 2. Pour chaque dossier actif, analyser les univers
  dossiersActifs.forEach(projectId => {
    const project = projectsMap.get(projectId);
    if (!project) return;

    const universes = project.data?.universes || [];
    if (universes.length === 0) universes.push("Non défini");

    const isSAV = isProjectSAV(projectId, interventions, project);
    const ca = isSAV ? getProjectCA(projectId, factures, dateRange) : 0;

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
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const statsParApporteur = new Map<number, { nom: string; type: string; total: number; sav: number; ca: number }>();

  // 1. Filtrer les interventions sur la période pour identifier les dossiers actifs
  const interventionsPeriode = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, dateRange);
    } catch {
      return false;
    }
  });

  const dossiersActifs = new Set<number>();
  interventionsPeriode.forEach(interv => {
    if (interv.projectId) dossiersActifs.add(interv.projectId);
  });

  // 2. Pour chaque dossier actif avec apporteur
  dossiersActifs.forEach(projectId => {
    const project = projectsMap.get(projectId);
    if (!project) return;

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

    const isSAV = isProjectSAV(projectId, interventions, project);
    if (isSAV) {
      stats.sav++;
      stats.ca += getProjectCA(projectId, factures, dateRange);
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
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const dossiersActifsParMois: Set<number>[] = Array.from({ length: 12 }, () => new Set());

  // Filtrer les interventions de l'année pour identifier les dossiers actifs par mois
  interventions.forEach(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return;

    try {
      const intervDate = parseISO(date);
      if (intervDate.getFullYear() !== year) return;

      const monthIndex = intervDate.getMonth();
      const projectId = interv.projectId;
      
      // Ajouter le dossier aux dossiers actifs du mois
      dossiersActifsParMois[monthIndex].add(projectId);
    } catch {
      return;
    }
  });

  // Pour chaque mois, calculer le nombre de dossiers actifs et de dossiers SAV
  dossiersActifsParMois.forEach((dossiersActifs, monthIndex) => {
    monthlyTotal[monthIndex] = dossiersActifs.size;

    dossiersActifs.forEach(projectId => {
      const project = projectsMap.get(projectId);
      if (!project) return;

      const isSAV = isProjectSAV(projectId, interventions, project);
      if (isSAV) {
        monthlyData[monthIndex].nbSAV++;
        
        // Calculer le CA SAV pour ce dossier dans ce mois
        const dateRange = {
          start: new Date(year, monthIndex, 1),
          end: new Date(year, monthIndex + 1, 0, 23, 59, 59)
        };
        monthlyData[monthIndex].caSAV += getProjectCA(projectId, factures, dateRange);
      }
    });
  });

  // Calculer les taux
  monthlyData.forEach((data, index) => {
    if (monthlyTotal[index] > 0) {
      data.tauxSAV = Math.round((data.nbSAV / monthlyTotal[index]) * 1000) / 10;
    }
  });

  return monthlyData;
};
