import { parseISO, isWithinInterval } from "date-fns";
import { isInitInvoice, isApporteur, getInitInvoiceApporteursAmount, INIT_INVOICE_PARTICULIERS } from "./dashboardCalculations";

export interface ApporteurStats {
  apporteurId: number;
  name: string;
  caHT: number;
  nbDossiers: number;
  nbDevis: number;
  tauxTransformation: number;
}

// Créer le référentiel des clients/apporteurs
const createClientsMap = (clients: any[]): Map<number, any> => {
  const map = new Map();
  clients.forEach(client => {
    map.set(client.id, {
      displayName: client.nom || client.prenom || "Client sans nom",
      typeClient: client.data?.type,
      codeCompta: client.codeCompta
    });
  });
  return map;
};

// Filtrer les factures de la période
const filterFacturesPeriode = (
  factures: any[],
  clients: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): any[] => {
  const clientsMap = createClientsMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  return factures.filter(facture => {
    // Type facture uniquement (pas les avoirs)
    const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
    if (typeFacture === "avoir") return false;
    
    // NE PAS exclure la facture d'init - elle sera traitée spécialement
    // (part apporteurs = montant total - part particuliers)
    
    // Filtrer par période
    const dateReelle = facture.dateReelle || facture.dateEmission || facture.created_at;
    if (!dateReelle) return false;
    
    try {
      const factureDate = parseISO(dateReelle);
      return isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });
};

// Calculer le TOP 5 des apporteurs
export const calculateTop10Apporteurs = (
  factures: any[],
  projects: any[],
  devis: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): ApporteurStats[] => {
  const clientsMap = createClientsMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  // Dictionnaire CA par apporteur
  const caApporteur: Map<number, number> = new Map();
  const dossiersApporteur: Map<number, Set<number>> = new Map();
  
  facturesPeriode.forEach(facture => {
    const projectId = facture.projectId;
    if (!projectId) return;
    
    const project = projectsMap.get(projectId);
    if (!project) return;
    
    // RÈGLE STRICTE : Ne garder QUE les dossiers APPORTEURS
    // (commanditaireId renseigné, clients directs exclus)
    if (!isApporteur(project)) return;
    
    const apporteurId = project.data?.commanditaireId || project.commanditaireId;
    
    // Vérifier si c'est la facture d'init JANVIER 2025
    const client = clientsMap.get(facture.clientId);
    let montant = 0;
    
    if (isInitInvoice(facture, client, project)) {
      // Utiliser la part APPORTEURS de la facture d'init
      montant = getInitInvoiceApporteursAmount(facture);
      if (import.meta.env.DEV) {
        console.log("💰 APPORTEURS - Facture INIT détectée, utilisation part apporteurs:", montant);
      }
    } else {
      // Calculer le montant HT normal
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    }
    
    if (isNaN(montant) || montant === 0) return;
    
    // Ajouter au CA
    const currentCA = caApporteur.get(apporteurId) || 0;
    caApporteur.set(apporteurId, currentCA + montant);
    
    // Compter les dossiers uniques
    if (!dossiersApporteur.has(apporteurId)) {
      dossiersApporteur.set(apporteurId, new Set());
    }
    dossiersApporteur.get(apporteurId)!.add(projectId);
  });
  
  // Calculer les stats de devis par apporteur
  const devisApporteur: Map<number, { total: number; transformes: number }> = new Map();
  
  devis.forEach(d => {
    const project = projectsMap.get(d.projectId);
    if (!project) return;
    
    const apporteurId = project.data?.commanditaireId;
    if (!apporteurId) return;
    
    if (!devisApporteur.has(apporteurId)) {
      devisApporteur.set(apporteurId, { total: 0, transformes: 0 });
    }
    
    const stats = devisApporteur.get(apporteurId)!;
    stats.total++;
    
    // Devis transformé si accepté/commandé ou facturé
    const state = d.state || d.data?.state;
    if (state === "invoice" || state === "accepted" || state === "order") {
      stats.transformes++;
    }
  });
  
  // Construire la liste des apporteurs avec leurs stats
  const liste: ApporteurStats[] = [];
  
  caApporteur.forEach((caHT, apporteurId) => {
    const client = clientsMap.get(apporteurId);
    if (!client) return;
    
    const devisStats = devisApporteur.get(apporteurId) || { total: 0, transformes: 0 };
    const tauxTransformation = devisStats.total > 0 
      ? (devisStats.transformes / devisStats.total) * 100 
      : 0;
    
    liste.push({
      apporteurId,
      name: client.displayName,
      caHT,
      nbDossiers: dossiersApporteur.get(apporteurId)?.size || 0,
      nbDevis: devisStats.total,
      tauxTransformation
    });
  });
  
// Trier par CA décroissant et garder le TOP 5
  return liste
    .sort((a, b) => b.caHT - a.caHT)
    .slice(0, 5);
};

// Interface pour les dossiers par apporteur
export interface DossiersParApporteur {
  apporteurId: number;
  name: string;
  nbDossiers: number;
}

// Calculer les dossiers confiés par apporteur
export const calculateDossiersConfiesParApporteur = (
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): DossiersParApporteur[] => {
  const clientsMap = createClientsMap(clients);
  const dossiersParApporteur: Map<number, Set<number>> = new Map();
  
  projects.forEach(project => {
    const apporteurId = project.data?.commanditaireId;
    
    // Exclure les clients directs
    if (!apporteurId) return;
    
    // Vérifier si le projet est dans la période
    const dateCreation = project.created_at;
    if (!dateCreation) return;
    
    try {
      const projectDate = parseISO(dateCreation);
      if (isWithinInterval(projectDate, { start: dateRange.start, end: dateRange.end })) {
        if (!dossiersParApporteur.has(apporteurId)) {
          dossiersParApporteur.set(apporteurId, new Set());
        }
        dossiersParApporteur.get(apporteurId)!.add(project.id);
      }
    } catch {
      // Ignorer les dates invalides
    }
  });
  
  // Construire la liste avec les noms
  const liste: DossiersParApporteur[] = [];
  
  dossiersParApporteur.forEach((dossiers, apporteurId) => {
    const client = clientsMap.get(apporteurId);
    if (!client) return;
    
    liste.push({
      apporteurId,
      name: client.displayName,
      nbDossiers: dossiers.size
    });
  });
  
  // Trier par nombre de dossiers décroissant
  return liste.sort((a, b) => b.nbDossiers - a.nbDossiers);
};

// Calculer la part des apporteurs sur le CA total
export const calculatePartApporteurs = (
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date },
  userAgency: string
): number => {
  // Vérifier si on est sur janvier 2025 avec override manuel
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;
  
  const clientsMap = createClientsMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures de la période (incluant la facture d'init)
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  let caTotal = 0;
  let caAvecApporteur = 0;
  
  facturesPeriode.forEach(facture => {
    const projectId = facture.projectId;
    if (!projectId) return;
    
    const project = projectsMap.get(projectId);
    if (!project) return;
    
    // Vérifier si c'est la facture d'init JANVIER 2025
    const client = clientsMap.get(facture.clientId);
    let montant = 0;
    
    if (isInitInvoice(facture, client, project)) {
      // Répartir la facture d'init
      const partApporteurs = getInitInvoiceApporteursAmount(facture);
      const partParticuliers = INIT_INVOICE_PARTICULIERS;
      
      caTotal += (partApporteurs + partParticuliers);
      
      // Seule la part apporteurs compte pour le CA avec apporteur
      caAvecApporteur += partApporteurs;
    } else {
      // Montant normal
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(montant)) return;
      
      caTotal += montant;
      
      // Vérifier si la facture a un apporteur
      const apporteurId = project.data?.commanditaireId;
      if (apporteurId) {
        caAvecApporteur += montant;
      }
    }
  });
  
  // Calculer le pourcentage
  if (caTotal === 0) return 0;
  return (caAvecApporteur / caTotal) * 100;
};

// Calculer le dû global (factures non payées) des apporteurs sur la période
export const calculateDuGlobal = (
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const clientsMap = createClientsMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  let duTotal = 0;
  
  facturesPeriode.forEach(facture => {
    const projectId = facture.projectId;
    if (!projectId) return;
    
    const project = projectsMap.get(projectId);
    if (!project) return;
    
    const apporteurId = project.data?.commanditaireId;
    
    // Exclure les clients directs
    if (!apporteurId) return;
    
    // Vérifier si la facture est non payée
    const state = facture.state || facture.data?.state;
    const isPaid = state === "paid" || state === "payed";
    
    if (!isPaid) {
      // Calculer le montant TTC
      const montantRaw = facture.totalTTC || facture.data?.totalTTC || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(montant)) {
        duTotal += montant;
      }
    }
  });
  
  return duTotal;
};

/**
 * Calcule le taux de transformation moyen des devis apporteurs en factures
 */
export const calculateTauxTransformationMoyen = (
  devis: any[],
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Sélectionner les projets avec apporteurs
  const projectsApporteurs = projects.filter(p => p.data?.commanditaireId);
  const apporteurProjectIds = new Set(projectsApporteurs.map(p => p.id));
  
  // Filtrer les devis apporteurs sur la période (par dateEmission)
  const devisPeriode = devis.filter((d) => {
    if (!apporteurProjectIds.has(d.projectId)) return false;
    
    const dateEmission = d.dateEmission || d.date || d.created_at;
    if (!dateEmission) return false;
    
    try {
      const devisDate = parseISO(dateEmission);
      return isWithinInterval(devisDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });
  
  if (devisPeriode.length === 0) return 0;
  
  // Filtrer les factures non-init de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  // Créer un Set des projectIds facturés
  const projectsFactures = new Set(facturesPeriode.map(f => f.projectId));
  
  // Compter les devis transformés
  let devisTransformes = 0;
  
  devisPeriode.forEach((d) => {
    // Condition 1: devis accepté ou en travaux
    const state = d.state || d.data?.state;
    const isAccepted = state === "accepted" || state === "order";
    
    // Condition 2: existe au moins une facture pour ce projet
    const hasFacture = projectsFactures.has(d.projectId);
    
    if (isAccepted || hasFacture) {
      devisTransformes++;
    }
  });
  
  return (devisTransformes / devisPeriode.length) * 100;
};

/**
 * Calcule le panier moyen HT par dossier apporteur facturé
 */
export const calculatePanierMoyenHT = (
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  let caApporteursTotal = 0;
  const dossiersFacturesApporteurs = new Set<number>();
  
  facturesPeriode.forEach((facture) => {
    const project = projectsMap.get(facture.projectId);
    
    // Ne garder que les factures apporteurs
    const apporteurId = project?.data?.commanditaireId;
    if (!apporteurId) return;
    
    const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    
    if (!isNaN(montant)) {
      caApporteursTotal += montant;
      dossiersFacturesApporteurs.add(facture.projectId);
    }
  });
  
  const nbDossiers = dossiersFacturesApporteurs.size;
  return nbDossiers > 0 ? caApporteursTotal / nbDossiers : 0;
};

/**
 * Calcule le délai moyen entre création du dossier et facture (en jours)
 */
export const calculateDelaiMoyenFacturation = (
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures apporteurs de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  const deltas: number[] = [];
  
  facturesPeriode.forEach((facture) => {
    const project = projectsMap.get(facture.projectId);
    
    // Ne garder que les factures apporteurs
    const apporteurId = project?.data?.commanditaireId;
    if (!apporteurId) return;
    
    // Récupérer les dates
    const dateFacture = facture.dateReelle || facture.date || facture.created_at;
    const dateCreation = project.created_at || project.dateCreation || project.data?.created_at;
    
    if (!dateFacture || !dateCreation) return;
    
    try {
      const tF = parseISO(dateFacture);
      const t0 = parseISO(dateCreation);
      
      // Calculer le délai en jours
      const deltaMs = tF.getTime() - t0.getTime();
      const deltaJours = deltaMs / (1000 * 60 * 60 * 24);
      
      if (deltaJours >= 0) {
        deltas.push(deltaJours);
      }
    } catch {
      // Ignorer les dates invalides
    }
  });
  
  if (deltas.length === 0) return 0;
  
  const somme = deltas.reduce((acc, d) => acc + d, 0);
  return somme / deltas.length;
};

/**
 * Calcule le taux de SAV sur les dossiers apporteurs
 */
export const calculateTauxSAV = (
  interventions: any[],
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les interventions sur la période
  const interventionsPeriode = interventions.filter((interv) => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });
  
  // Identifier les dossiers apporteurs avec SAV
  const dossiersSavApporteurs = new Set<number>();
  
  interventionsPeriode.forEach((interv) => {
    const project = projectsMap.get(interv.projectId);
    const apporteurId = project?.data?.commanditaireId;
    if (!apporteurId) return;
    
    // Vérifier si c'est un SAV
    const type2 = interv.type2 || interv.data?.type2 || "";
    const type = interv.type || interv.data?.type || "";
    
    const isSav = 
      type2.toLowerCase().includes("sav") ||
      type.toLowerCase().includes("sav");
    
    if (isSav) {
      dossiersSavApporteurs.add(interv.projectId);
    }
  });
  
  // Compter les dossiers apporteurs facturés sur la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  const dossiersApporteurs = new Set<number>();
  
  facturesPeriode.forEach((facture) => {
    const project = projectsMap.get(facture.projectId);
    const apporteurId = project?.data?.commanditaireId;
    
    if (apporteurId) {
      dossiersApporteurs.add(facture.projectId);
    }
  });
  
  const nbDossiersApporteurs = dossiersApporteurs.size;
  if (nbDossiersApporteurs === 0) return 0;
  
  return (dossiersSavApporteurs.size / nbDossiersApporteurs) * 100;
};

/**
 * Calcule le taux de SAV sur TOUS les dossiers (pas seulement apporteurs)
 */
export const calculateTauxSAVGlobal = (
  interventions: any[],
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): number => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les interventions sur la période
  const interventionsPeriode = interventions.filter((interv) => {
    const date = interv.date || interv.dateIntervention || interv.created_at;
    if (!date) return false;
    
    try {
      const intervDate = parseISO(date);
      return isWithinInterval(intervDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  });
  
  // Identifier TOUS les dossiers avec SAV (pas seulement apporteurs)
  const dossiersSav = new Set<number>();
  
  interventionsPeriode.forEach((interv) => {
    // Vérifier si c'est un SAV
    const type2 = interv.type2 || interv.data?.type2 || "";
    const type = interv.type || interv.data?.type || "";
    
    const isSav = 
      type2.toLowerCase().includes("sav") ||
      type.toLowerCase().includes("sav");
    
    if (isSav) {
      dossiersSav.add(interv.projectId);
    }
  });
  
  // Compter TOUS les dossiers facturés sur la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  const dossiersFactures = new Set<number>();
  
  facturesPeriode.forEach((facture) => {
    dossiersFactures.add(facture.projectId);
  });
  
  const nbDossiers = dossiersFactures.size;
  if (nbDossiers === 0) return 0;
  
  return (dossiersSav.size / nbDossiers) * 100;
};

/**
 * Interface pour le FLOP 10 (apporteurs avec le plus de dû)
 */
export interface FlopApporteurStats {
  apporteurId: number;
  name: string;
  duTotal: number;
  nbFacturesImpayees: number;
}

/**
 * Calcule le FLOP 5 des apporteurs avec le plus de dû (factures non payées)
 */
export const calculateFlop10Apporteurs = (
  factures: any[],
  projects: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): FlopApporteurStats[] => {
  const clientsMap = createClientsMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Filtrer les factures de la période
  const facturesPeriode = filterFacturesPeriode(factures, clients, projects, dateRange);
  
  // Dictionnaire dû par apporteur
  const duApporteur: Map<number, number> = new Map();
  const facturesImpayeesApporteur: Map<number, number> = new Map();
  
  facturesPeriode.forEach(facture => {
    const projectId = facture.projectId;
    if (!projectId) return;
    
    const project = projectsMap.get(projectId);
    if (!project) return;
    
    const apporteurId = project.data?.commanditaireId;
    
    // Exclure les clients directs
    if (!apporteurId) return;
    
    // Vérifier si la facture est non payée
    const state = facture.state || facture.data?.state;
    const isPaid = state === "paid" || state === "payed";
    
    if (!isPaid) {
      // Calculer le montant TTC
      const montantRaw = facture.totalTTC || facture.data?.totalTTC || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(montant)) {
        const currentDu = duApporteur.get(apporteurId) || 0;
        duApporteur.set(apporteurId, currentDu + montant);
        
        const currentCount = facturesImpayeesApporteur.get(apporteurId) || 0;
        facturesImpayeesApporteur.set(apporteurId, currentCount + 1);
      }
    }
  });
  
  // Construire la liste des apporteurs avec dû
  const liste: FlopApporteurStats[] = [];
  
  duApporteur.forEach((duTotal, apporteurId) => {
    const client = clientsMap.get(apporteurId);
    if (!client) return;
    
    liste.push({
      apporteurId,
      name: client.displayName,
      duTotal,
      nbFacturesImpayees: facturesImpayeesApporteur.get(apporteurId) || 0
    });
  });
  
  // Trier par dû décroissant et garder le TOP 5
  return liste
    .sort((a, b) => b.duTotal - a.duTotal)
    .slice(0, 5);
};
