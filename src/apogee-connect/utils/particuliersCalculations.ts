import { parseISO, isWithinInterval } from "date-fns";
import { logDebug, logWarn, logError } from "@/lib/logger";

export interface ParticuliersStats {
  caHT: number;
  nbDossiers: number;
  nbFactures: number;
  panierMoyen: number;
  tauxTransformation: number | null;
  tauxSAV: number | null;
}

// Filtrer les factures de la période pour les PARTICULIERS uniquement
const filterFacturesPeriodeParticuliers = (
  factures: any[],
  clients: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): any[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  if (import.meta.env.DEV) {
    logDebug('PARTICULIERS', 'Filtrage des factures', { nbFactures: factures.length, nbProjects: projects.length });
  }
  
  const result = factures.filter(facture => {
    // Type facture uniquement (pas les avoirs)
    const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
    if (typeFacture === "avoir") return false;
    
    // Récupérer le projet
    const project = projectsMap.get(facture.projectId);
    if (!project) {
      return false;
    }
    
    // RÈGLE STRICTE : Ne garder QUE les dossiers PARTICULIERS
    // (commanditaireId null/undefined, clients directs uniquement)
    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    const estParticulier = !commanditaireId;
    
    if (!estParticulier) return false;
    
    // Filtrer par période
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return false;
    
    try {
      const factureDate = parseISO(dateReelle);
      const dansLaPeriode = isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end });
      
      if (dansLaPeriode && import.meta.env.DEV) {
        logDebug('PARTICULIERS', 'Facture particulier trouvée', { id: facture.id, ref: facture.reference, projectId: facture.projectId, commanditaireId, montant: facture.totalHT || facture.data?.totalHT });
      }
      
      return dansLaPeriode;
    } catch (error) {
      logError('PARTICULIERS', 'Erreur parsing date facture', { dateReelle, error });
      return false;
    }
  });
  
  if (import.meta.env.DEV) {
    logDebug('PARTICULIERS', 'Résultat filtrage', { count: result.length });
  }
  return result;
};

// Calculer les statistiques des PARTICULIERS
export const calculateParticuliersStats = (
  factures: any[],
  projects: any[],
  devis: any[],
  interventions: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): ParticuliersStats => {
  if (import.meta.env.DEV) {
    logDebug('PARTICULIERS', 'Début du calcul', { nbFactures: factures.length, nbProjects: projects.length, dateRange });
  }
  
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Debug: vérifier quelques projets
  if (import.meta.env.DEV) {
    const sampleProjects = projects.slice(0, 5);
    logDebug('PARTICULIERS', 'Échantillon de projets', { sample: sampleProjects.map(p => ({ id: p.id, commanditaireId: p.data?.commanditaireId || p.commanditaireId, isParticulier: !p.data?.commanditaireId && !p.commanditaireId })) });
  }
  
  // Filtrer les factures de la période pour particuliers
  const facturesPeriode = filterFacturesPeriodeParticuliers(factures, clients, projects, dateRange);
  
  if (import.meta.env.DEV) {
    console.log("💰 PARTICULIERS - Factures filtrées:", facturesPeriode.length);
    if (facturesPeriode.length > 0) {
      console.log("📄 Première facture particulier:", facturesPeriode[0]);
    }
  }
  
  // Agréger CA, dossiers, factures
  let caHT = 0;
  const dossiers = new Set<number>();
  let nbFactures = 0;
  
  facturesPeriode.forEach(facture => {
    // Calculer le montant HT
    const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    
    if (!isNaN(montant) && montant !== 0) {
      caHT += montant;
      nbFactures += 1;
      dossiers.add(facture.projectId);
    } else {
      logWarn('PARTICULIERS', 'Montant invalide pour facture', { id: facture.id, ref: facture.reference, montantRaw, montant });
    }
  });
  
  const nbDossiers = dossiers.size;
  const panierMoyen = nbDossiers > 0 ? caHT / nbDossiers : 0;
  
  if (import.meta.env.DEV) {
    logDebug('PARTICULIERS', 'Résultats', { caHT, nbDossiers, nbFactures, panierMoyen });
  }
  
  // Calculer le taux de transformation
  const tauxTransformation = calculateTauxTransformationParticuliers(devis, projects, factures, clients, dateRange);
  
  // Calculer le taux de SAV
  const tauxSAV = calculateTauxSAVParticuliers(interventions, projects, dateRange);
  
  return {
    caHT,
    nbDossiers,
    nbFactures,
    panierMoyen,
    tauxTransformation,
    tauxSAV
  };
};

// Calculer le taux de transformation pour les particuliers
const calculateTauxTransformationParticuliers = (
  devis: any[],
  projects: any[],
  factures: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number | null => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const facturesSet = new Set(
    factures
      .filter(f => {
        const typeFacture = f.typeFacture || f.data?.type || f.state;
        return typeFacture !== "avoir";
      })
      .map(f => f.projectId)
  );
  
  let devisTotal = 0;
  let devisTransformes = 0;
  
  // Filtrer les devis de la période pour particuliers
  devis.forEach(d => {
    const dateEmission = d.date || d.dateEmission || d.created_at;
    if (!dateEmission) return;
    
    try {
      const devisDate = parseISO(dateEmission);
      if (!isWithinInterval(devisDate, { start: dateRange.start, end: dateRange.end })) return;
    } catch {
      return;
    }
    
    const project = projectsMap.get(d.projectId);
    if (!project) return;
    
    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    const estParticulier = !commanditaireId;
    if (!estParticulier) return;
    
    // Compter les devis totaux
    devisTotal += 1;
    
    // Vérifier si transformé
    const isTransformed = 
      d.state === "accepted" || 
      d.state === "order" || 
      facturesSet.has(d.projectId);
    
    if (isTransformed) {
      devisTransformes += 1;
    }
  });
  
  if (devisTotal === 0) return null;
  return (devisTransformes / devisTotal) * 100;
};

// Calculer le taux de SAV pour les particuliers
// Taux SAV = (Nb de dossiers particuliers avec au moins 1 SAV / Nb total de dossiers particuliers) × 100
const calculateTauxSAVParticuliers = (
  interventions: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): number | null => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // ÉTAPE 1: Identifier tous les dossiers SAV via interventions
  const projectHasSavFromInterv: Record<number, boolean> = {};
  
  interventions.forEach(interv => {
    const pid = interv.projectId;
    if (!pid) return;
    
    const pictos = interv.data?.pictosInterv ?? [];
    const type2 = interv.data?.type2 ?? null;
    
    // Détecter SAV via pictosInterv ou type2
    if (pictos.includes("SAV") || type2 === "SAV") {
      projectHasSavFromInterv[pid] = true;
    }
  });
  
  // ÉTAPE 2: Identifier tous les dossiers SAV via drapeaux project
  const projectHasSavFromProject: Record<number, boolean> = {};
  
  projects.forEach(p => {
    const pid = p.id;
    const picto = p.data?.pictoInterv ?? [];
    const sinistre = p.data?.sinistre ?? null;
    
    // Détecter SAV via pictoInterv ou sinistre
    if (picto.includes("SAV") || sinistre === "SAV") {
      projectHasSavFromProject[pid] = true;
    }
  });
  
  // ÉTAPE 3: Flag final isSAV du project
  const projectIsSav: Record<number, boolean> = {};
  
  projects.forEach(p => {
    const pid = p.id;
    const fromInterv = projectHasSavFromInterv[pid] === true;
    const fromProject = projectHasSavFromProject[pid] === true;
    
    projectIsSav[pid] = fromInterv || fromProject;
  });
  
  // ÉTAPE 4: Compter tous les dossiers particuliers et ceux avec SAV
  let totalProjectsParticuliers = 0;
  let savProjectsParticuliers = 0;
  
  projects.forEach(p => {
    const pid = p.id;
    
    // Identifier si c'est un particulier
    const commanditaireId = p.data?.commanditaireId || p.commanditaireId;
    const estParticulier = !commanditaireId;
    
    if (!estParticulier) return;
    
    // Compter ce dossier dans le total particuliers
    totalProjectsParticuliers += 1;
    
    // Si c'est un dossier SAV, l'ajouter au compteur SAV
    if (projectIsSav[pid]) {
      savProjectsParticuliers += 1;
    }
  });
  
  // ÉTAPE 5: Calculer le taux SAV
  if (totalProjectsParticuliers === 0) return null;
  
  const taux = Math.round((savProjectsParticuliers / totalProjectsParticuliers) * 1000) / 10; // ex: 70.9%
  return taux;
};
