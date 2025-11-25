import { parseISO, isWithinInterval } from "date-fns";
import { isInitInvoice, isApporteur, getInitInvoiceApporteursAmount } from "./dashboardCalculations";

export interface TypeApporteurStats {
  type: string;
  caHT: number;
  nbDossiers: number;
  nbFactures: number;
  panierMoyen: number;
  tauxTransformation: number | null;
  tauxSAV: number | null;
}

// Créer le référentiel des clients/apporteurs avec leur type
const createApporteursMap = (clients: any[]): Map<number, { name: string; type: string }> => {
  const map = new Map();
  clients.forEach(client => {
    // Ne garder que les apporteurs (isCommanditaire === true)
    // ET exclure explicitement le type "particulier"
    if (client.data?.isCommanditaire === true) {
      const type = client.data?.type || "Non défini";
      
      // EXCLUSION : "particulier" n'est PAS un type d'apporteur
      // Les particuliers sont des clients directs (sans commanditaireId)
      if (type.toLowerCase() === "particulier") {
        return;
      }
      
      const displayName = client.raisonSociale || 
                         (client.nom && client.prenom ? `${client.nom} ${client.prenom}` : client.nom) || 
                         client.displayName || 
                         "Apporteur sans nom";
      map.set(client.id, { name: displayName, type });
    }
  });
  return map;
};

// Filtrer les factures de la période pour les apporteurs
const filterFacturesPeriodeApporteurs = (
  factures: any[],
  clients: any[],
  projects: any[],
  apporteursMap: Map<number, { name: string; type: string }>,
  dateRange: { start: Date; end: Date }
): any[] => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  return factures.filter(facture => {
    // Type facture uniquement (pas les avoirs)
    const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
    if (typeFacture === "avoir") return false;
    
    // NE PAS exclure la facture d'init - elle sera traitée spécialement
    // (part apporteurs = montant total - part particuliers)
    
    const project = projectsMap.get(facture.projectId);
    
    // RÈGLE STRICTE : Ne garder QUE les dossiers APPORTEURS
    // (commanditaireId renseigné, clients directs / particuliers exclus)
    if (!project || !isApporteur(project)) return false;
    
    // Vérifier que l'apporteur existe bien dans le référentiel
    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!apporteursMap.has(commanditaireId)) return false;
    
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

// Calculer les statistiques par type d'apporteur
export const calculateTypesApporteursStats = (
  factures: any[],
  projects: any[],
  devis: any[],
  interventions: any[],
  clients: any[],
  dateRange: { start: Date; end: Date }
): TypeApporteurStats[] => {
  const apporteursMap = createApporteursMap(clients);
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  if (apporteursMap.size === 0) {
    console.log("⚠️ Aucun apporteur trouvé");
    return [];
  }
  
  // Identifier tous les types distincts
  const typesSet = new Set<string>();
  apporteursMap.forEach(({ type }) => typesSet.add(type));
  
  // Initialiser les agrégats par type
  const statsParType = new Map<string, {
    caHT: number;
    dossiers: Set<number>;
    nbFactures: number;
  }>();
  
  typesSet.forEach(type => {
    statsParType.set(type, {
      caHT: 0,
      dossiers: new Set(),
      nbFactures: 0
    });
  });
  
  // Filtrer les factures de la période
  const facturesPeriode = filterFacturesPeriodeApporteurs(factures, clients, projects, apporteursMap, dateRange);
  
  // Agréger CA, dossiers, factures par type
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  
  facturesPeriode.forEach(facture => {
    const project = projectsMap.get(facture.projectId);
    if (!project || !project.data?.commanditaireId) return;
    
    const apporteur = apporteursMap.get(project.data.commanditaireId);
    if (!apporteur) return;
    
    const type = apporteur.type;
    const stats = statsParType.get(type);
    if (!stats) return;
    
    // Vérifier si c'est la facture d'init JANVIER 2025
    const client = clientsMap.get(facture.clientId);
    let montant = 0;
    
    if (isInitInvoice(facture, client, project)) {
      // Utiliser la part APPORTEURS de la facture d'init
      montant = getInitInvoiceApporteursAmount(facture);
    } else {
      // Calculer le montant HT normal
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    }
    
    if (!isNaN(montant)) {
      stats.caHT += montant;
      stats.nbFactures += 1;
      stats.dossiers.add(facture.projectId);
    }
  });
  
  // Calculer les taux de transformation par type
  const tauxTransfoParType = calculateTauxTransformationParType(devis, projects, factures, clients, apporteursMap, dateRange);
  
  // Calculer les taux de SAV par type
  // IMPORTANT : Le dénominateur doit être les dossiers FACTURÉS (statsParType[type].dossiers)
  const tauxSAVParType = calculateTauxSAVParType(interventions, statsParType, projects, apporteursMap, dateRange);
  
  // Construire le résultat
  const results: TypeApporteurStats[] = [];
  
  typesSet.forEach(type => {
    const stats = statsParType.get(type);
    if (!stats) return;
    
    const nbDossiers = stats.dossiers.size;
    const panierMoyen = nbDossiers > 0 ? stats.caHT / nbDossiers : 0;
    
    results.push({
      type,
      caHT: stats.caHT,
      nbDossiers,
      nbFactures: stats.nbFactures,
      panierMoyen,
      tauxTransformation: tauxTransfoParType.get(type) || null,
      tauxSAV: tauxSAVParType.get(type) || null
    });
  });
  
  // Trier par CA décroissant
  return results.sort((a, b) => b.caHT - a.caHT);
};

// Calculer le taux de transformation par type
const calculateTauxTransformationParType = (
  devis: any[],
  projects: any[],
  factures: any[],
  clients: any[],
  apporteursMap: Map<number, { name: string; type: string }>,
  dateRange: { start: Date; end: Date }
): Map<string, number> => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const facturesSet = new Set(
    factures
      .filter(f => {
        const typeFacture = f.typeFacture || f.data?.type || f.state;
        return typeFacture !== "avoir";
      })
      .filter(f => {
        const client = clients.find(c => c.id === f.clientId);
        const project = projectsMap.get(f.projectId);
        return !isInitInvoice(f, client, project);
      })
      .map(f => f.projectId)
  );
  
  const devisTotalParType = new Map<string, number>();
  const devisTransformesParType = new Map<string, number>();
  
  // Filtrer les devis de la période
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
    if (!project || !project.data?.commanditaireId) return;
    
    const apporteur = apporteursMap.get(project.data.commanditaireId);
    if (!apporteur) return;
    
    const type = apporteur.type;
    
    // Compter les devis totaux
    devisTotalParType.set(type, (devisTotalParType.get(type) || 0) + 1);
    
    // Vérifier si transformé
    const isTransformed = 
      d.state === "accepted" || 
      d.state === "order" || 
      facturesSet.has(d.projectId);
    
    if (isTransformed) {
      devisTransformesParType.set(type, (devisTransformesParType.get(type) || 0) + 1);
    }
  });
  
  const tauxParType = new Map<string, number>();
  devisTotalParType.forEach((total, type) => {
    const transformes = devisTransformesParType.get(type) || 0;
    tauxParType.set(type, total > 0 ? (transformes / total) * 100 : 0);
  });
  
  return tauxParType;
};

// Calculer le taux de SAV par type
// Taux SAV type X = (nombre de dossiers facturés de ce type ayant au moins un SAV) 
//                   / (nombre total de dossiers facturés de ce type)
const calculateTauxSAVParType = (
  interventions: any[],
  statsParType: Map<string, { caHT: number; dossiers: Set<number>; nbFactures: number }>,
  projects: any[],
  apporteursMap: Map<number, { name: string; type: string }>,
  dateRange: { start: Date; end: Date }
): Map<string, number> => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Map pour stocker les dossiers avec SAV par type
  const dossiersSAVParType = new Map<string, Set<number>>();
  
  // Initialiser les sets pour chaque type
  statsParType.forEach((stats, type) => {
    dossiersSAVParType.set(type, new Set());
  });
  
  // Filtrer les interventions SAV de la période
  interventions.forEach(intervention => {
    const dateIntervention = intervention.date || intervention.dateIntervention || intervention.created_at;
    if (!dateIntervention) return;
    
    try {
      const interventionDate = parseISO(dateIntervention);
      if (!isWithinInterval(interventionDate, { start: dateRange.start, end: dateRange.end })) return;
    } catch {
      return;
    }
    
    // Vérifier que c'est un SAV
    const isSAV = intervention.type2?.toLowerCase().includes("sav") || 
                  intervention.data?.picto?.toLowerCase().includes("sav") ||
                  intervention.data?.type?.toLowerCase().includes("sav");
    
    if (!isSAV) return;
    
    // Récupérer le projet et vérifier qu'il a un apporteur
    const project = projectsMap.get(intervention.projectId);
    if (!project || !project.data?.commanditaireId) return;
    
    const apporteur = apporteursMap.get(project.data.commanditaireId);
    if (!apporteur) return;
    
    const type = apporteur.type;
    
    // Vérifier que ce dossier fait partie des dossiers facturés de ce type
    const dossiersFactures = statsParType.get(type)?.dossiers;
    if (!dossiersFactures || !dossiersFactures.has(project.id)) return;
    
    // Ajouter le dossier aux dossiers avec SAV
    if (!dossiersSAVParType.has(type)) {
      dossiersSAVParType.set(type, new Set());
    }
    dossiersSAVParType.get(type)!.add(project.id);
  });
  
  // Calculer le taux pour chaque type
  const tauxSAVParType = new Map<string, number>();
  
  statsParType.forEach((stats, type) => {
    const nbDossiersFactures = stats.dossiers.size; // Dénominateur
    const nbDossiersSAV = dossiersSAVParType.get(type)?.size || 0; // Numérateur
    
    if (nbDossiersFactures === 0) {
      tauxSAVParType.set(type, 0);
    } else {
      tauxSAVParType.set(type, (nbDossiersSAV / nbDossiersFactures) * 100);
    }
  });
  
  return tauxSAVParType;
};
