import { parseISO, isWithinInterval } from "date-fns";
import { isInitInvoice, INIT_INVOICE_PARTICULIERS } from "./dashboardCalculations";

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
  
  console.log("🔍 PARTICULIERS - Filtrage des factures", {
    nbFactures: factures.length,
    nbProjects: projects.length
  });
  
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
      
      if (dansLaPeriode) {
        const client = clients.find(c => c.id === facture.clientId);
        const isInit = isInitInvoice(facture, client, project);
        console.log("✅ Facture particulier trouvée:", {
          id: facture.id,
          ref: facture.reference,
          projectId: facture.projectId,
          commanditaireId,
          montant: facture.totalHT || facture.data?.totalHT,
          isInit
        });
      }
      
      return dansLaPeriode;
    } catch (error) {
      console.error("❌ Erreur parsing date facture:", dateReelle, error);
      return false;
    }
  });
  
  console.log("📋 PARTICULIERS - Résultat filtrage:", result.length);
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
  console.log("🔍 PARTICULIERS - Début du calcul", {
    nbFactures: factures.length,
    nbProjects: projects.length,
    dateRange
  });
  
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Debug: vérifier quelques projets
  const sampleProjects = projects.slice(0, 5);
  console.log("📦 Échantillon de projets:", sampleProjects.map(p => ({
    id: p.id,
    commanditaireId: p.data?.commanditaireId || p.commanditaireId,
    isParticulier: !p.data?.commanditaireId && !p.commanditaireId
  })));
  
  // Filtrer les factures de la période pour particuliers
  const facturesPeriode = filterFacturesPeriodeParticuliers(factures, clients, projects, dateRange);
  
  console.log("💰 PARTICULIERS - Factures filtrées:", facturesPeriode.length);
  if (facturesPeriode.length > 0) {
    console.log("📄 Première facture particulier:", facturesPeriode[0]);
  }
  
  // Agréger CA, dossiers, factures
  let caHT = 0;
  const dossiers = new Set<number>();
  let nbFactures = 0;
  
  facturesPeriode.forEach(facture => {
    const client = clients.find(c => c.id === facture.clientId);
    const project = projectsMap.get(facture.projectId);
    
    // Vérifier si c'est la facture d'init JANVIER 2025
    if (isInitInvoice(facture, client, project)) {
      console.log("💰 PARTICULIERS - Facture INIT détectée, utilisation part particuliers:", INIT_INVOICE_PARTICULIERS);
      // Utiliser la part particuliers fixe
      caHT += INIT_INVOICE_PARTICULIERS;
      nbFactures += 1;
      dossiers.add(facture.projectId);
    } else {
      // Calculer le montant HT normal
      const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(montant) && montant !== 0) {
        caHT += montant;
        nbFactures += 1;
        dossiers.add(facture.projectId);
      } else {
        console.warn("⚠️ PARTICULIERS - Montant invalide pour facture:", {
          id: facture.id,
          ref: facture.reference,
          montantRaw,
          montant
        });
      }
    }
  });
  
  const nbDossiers = dossiers.size;
  const panierMoyen = nbDossiers > 0 ? caHT / nbDossiers : 0;
  
  console.log("📊 PARTICULIERS - Résultats:", {
    caHT,
    nbDossiers,
    nbFactures,
    panierMoyen
  });
  
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
      .filter(f => {
        const client = clients.find(c => c.id === f.clientId);
        const project = projectsMap.get(f.projectId);
        return !isInitInvoice(f, client, project);
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
const calculateTauxSAVParticuliers = (
  interventions: any[],
  projects: any[],
  dateRange: { start: Date; end: Date }
): number | null => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  const dossiersTotaux = new Set<number>();
  const dossiersSAV = new Set<number>();
  
  // Filtrer les interventions de la période
  interventions.forEach(intervention => {
    const dateIntervention = intervention.date || intervention.dateIntervention || intervention.created_at;
    if (!dateIntervention) return;
    
    try {
      const interventionDate = parseISO(dateIntervention);
      if (!isWithinInterval(interventionDate, { start: dateRange.start, end: dateRange.end })) return;
    } catch {
      return;
    }
    
    const project = projectsMap.get(intervention.projectId);
    if (!project) return;
    
    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    const estParticulier = !commanditaireId;
    if (!estParticulier) return;
    
    // Tous les dossiers particuliers
    dossiersTotaux.add(project.id);
    
    // Dossiers avec SAV
    const isSAV = intervention.type2?.toLowerCase().includes("sav") || 
                  intervention.data?.picto?.toLowerCase().includes("sav");
    
    if (isSAV) {
      dossiersSAV.add(project.id);
    }
  });
  
  const nbTotal = dossiersTotaux.size;
  if (nbTotal === 0) return null;
  
  const nbSAV = dossiersSAV.size;
  return (nbSAV / nbTotal) * 100;
};
