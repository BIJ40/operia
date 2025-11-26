import { parseISO, isWithinInterval, format } from "date-fns";
import { fr } from "date-fns/locale";
import { resolveTech, TechnicienInfo } from "./techTools";

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
 * Trouve le dernier technicien intervenu AVANT une intervention SAV
 * Exclut les RT et autres SAV pour ne garder que les interventions productives
 */
const getResponsibleTechBeforeSAV = (
  savIntervention: any,
  allInterventionsOfProject: any[]
): { techId: string; durationsByTech: Record<string, number> } | null => {
  // Trier les interventions par date croissante
  const sortedIntervs = allInterventionsOfProject
    .filter(i => i.date)
    .sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });

  // Trouver l'index de l'intervention SAV
  const savIndex = sortedIntervs.findIndex(i => i.id === savIntervention.id);
  if (savIndex === -1) return null;

  // Chercher en arrière la dernière intervention productive (ni RT ni SAV)
  for (let k = savIndex - 1; k >= 0; k--) {
    const prevInterv = sortedIntervs[k];
    
    const type2 = prevInterv.type2 || prevInterv.data?.type2 || "";
    const type = prevInterv.type || prevInterv.data?.type || "";
    
    // Exclure RT et SAV
    const isRT = type2 === "RT" || type === "RT" || prevInterv.data?.birt === true;
    const isSAV = type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
    
    if (!isRT && !isSAV) {
      // C'est une intervention productive, extraire les durées par technicien
      const durationsByTech: Record<string, number> = {};
      
      // Extraire les techniciens de toutes les visites
      const visites = prevInterv.visites || prevInterv.data?.visites || [];
      visites.forEach((visite: any) => {
        const duree = visite.duree || 0;
        const usersIds = visite.usersIds || [];
        
        usersIds.forEach((techId: string) => {
          durationsByTech[techId] = (durationsByTech[techId] || 0) + duree;
        });
      });
      
      // Si pas de technicien dans visites, essayer userId direct
      if (Object.keys(durationsByTech).length === 0 && prevInterv.userId) {
        durationsByTech[prevInterv.userId] = prevInterv.duree || 0;
      }
      
      if (Object.keys(durationsByTech).length === 0) {
        continue; // Pas de tech trouvé, continuer à chercher
      }
      
      // Identifier le technicien principal (plus grande durée)
      const techEntries = Object.entries(durationsByTech);
      const [respTechId] = techEntries.sort((a, b) => b[1] - a[1])[0];
      
      return { techId: respTechId, durationsByTech };
    }
  }
  
  return null; // Aucune intervention productive trouvée avant le SAV
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
  TECHS: Record<number, TechnicienInfo>,
  dateRange: { start: Date; end: Date }
): SAVByTechnicien[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const statsParTech = new Map<string, { nbInterventions: number; projects: Set<number>; heures: number; ca: number }>();

  console.log("[SAV Technicien] Début calcul - TECHS:", Object.keys(TECHS).length, "projets:", projects.length, "interventions:", interventions.length);

  // 1. Grouper les interventions par projectId pour un accès rapide
  const interventionsByProject = new Map<number, any[]>();
  interventions.forEach(interv => {
    if (!interv.projectId) return;
    const list = interventionsByProject.get(interv.projectId) ?? [];
    list.push(interv);
    interventionsByProject.set(interv.projectId, list);
  });

  // 2. Identifier toutes les interventions SAV dans la période
  const savInterventions = interventions.filter(interv => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      if (!isWithinInterval(intervDate, dateRange)) return false;
    } catch {
      return false;
    }

    const type2 = interv.type2 || interv.data?.type2 || "";
    const type = interv.type || interv.data?.type || "";
    return type2.toLowerCase().includes("sav") || type.toLowerCase().includes("sav");
  });

  console.log(`[SAV Technicien] ${savInterventions.length} interventions SAV trouvées dans la période`);

  // 3. Pour chaque intervention SAV, trouver le technicien responsable (dernier intervenu AVANT le SAV)
  const savAttributions = new Map<string, { interventions: Set<any>; projects: Set<number>; ca: number; heures: number }>();

  savInterventions.forEach(savInterv => {
    const projectId = savInterv.projectId;
    if (!projectId) return;

    const projectInterventions = interventionsByProject.get(projectId) ?? [];
    const responsible = getResponsibleTechBeforeSAV(savInterv, projectInterventions);

    if (!responsible) {
      console.warn(`[SAV Technicien] Aucun technicien responsable trouvé pour SAV projet ${projectId} (intervention ${savInterv.id})`);
      return;
    }

    const { techId, durationsByTech } = responsible;

    // Initialiser les stats si nécessaire
    if (!savAttributions.has(techId)) {
      savAttributions.set(techId, { interventions: new Set(), projects: new Set(), ca: 0, heures: 0 });
    }

    const stats = savAttributions.get(techId)!;
    stats.interventions.add(savInterv.id);
    stats.projects.add(projectId);

    // Extraire les durées du SAV (en minutes) et convertir en heures
    const duree = savInterv.data?.heures || savInterv.duree || 0;
    const dureeNum = parseFloat(String(duree).replace(/[^0-9.-]/g, ''));
    if (!isNaN(dureeNum)) {
      stats.heures += dureeNum / 60; // Conversion minutes -> heures
    }
  });

  console.log(`[SAV Technicien] SAV attribués à ${savAttributions.size} techniciens`);

  // 4. Calculer le CA SAV pour chaque projet et l'attribuer
  const projectsWithSAV = new Set<number>();
  savInterventions.forEach(interv => {
    if (interv.projectId) projectsWithSAV.add(interv.projectId);
  });

  projectsWithSAV.forEach(projectId => {
    const caProject = getProjectCA(projectId, factures, dateRange);
    if (caProject === 0) return;

    // Trouver tous les SAV de ce projet et leurs techniciens responsables
    const savIntervsOfProject = savInterventions.filter(i => i.projectId === projectId);
    
    savIntervsOfProject.forEach(savInterv => {
      const projectInterventions = interventionsByProject.get(projectId) ?? [];
      const responsible = getResponsibleTechBeforeSAV(savInterv, projectInterventions);
      
      if (responsible) {
        const { techId } = responsible;
        const stats = savAttributions.get(techId);
        if (stats) {
          // Répartir le CA équitablement entre tous les SAV du projet
          stats.ca += caProject / savIntervsOfProject.length;
        }
      }
    });
  });

  // 5. Construire le résultat final
  const result: SAVByTechnicien[] = [];

  savAttributions.forEach((stats, techId) => {
    const techIdNum = typeof techId === 'string' ? parseInt(techId, 10) : techId;
    const resolved = resolveTech(techIdNum, TECHS);

    console.log(`[SAV Technicien] ${resolved.label}: ${stats.projects.size} projets, ${stats.interventions.size} interventions, ${stats.ca.toFixed(2)}€`);

    result.push({
      technicienId: String(techId),
      technicienNom: resolved.label,
      nbInterventionsSAV: stats.interventions.size,
      nbProjectsSAV: stats.projects.size,
      heuresSAV: Math.round(stats.heures * 10) / 10,
      caSAV: stats.ca,
    });
  });

  return result.sort((a, b) => b.caSAV - a.caSAV);
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
