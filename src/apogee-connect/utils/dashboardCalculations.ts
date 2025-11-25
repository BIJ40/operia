import { isToday, parseISO, differenceInDays, startOfDay, endOfDay, subDays, isWithinInterval } from "date-fns";

// ====================================================================
// FONCTIONS UTILITAIRES
// ====================================================================

export const isRT = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type2
  if (intervention.type2?.toLowerCase().includes("relevé technique") || 
      intervention.type2?.toLowerCase().includes("releve technique")) {
    return true;
  }
  
  // Vérifier data.biRt
  if (intervention.data?.biRt || intervention.data?.isRT) {
    return true;
  }
  
  return false;
};

export const isDepannage = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type ou type2
  if (intervention.type?.toLowerCase().includes("dépannage") ||
      intervention.type?.toLowerCase().includes("depannage") ||
      intervention.type2?.toLowerCase().includes("dépannage") ||
      intervention.type2?.toLowerCase().includes("depannage")) {
    return true;
  }
  
  // Vérifier data.biDepan avec travaux réalisés
  if (intervention.data?.biDepan?.items?.some((item: any) => item.isWorkDone || item.tvxEffectues)) {
    return true;
  }
  
  return false;
};

export const isTravaux = (intervention: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type2
  if (intervention.type2?.toLowerCase().includes("travaux")) {
    return true;
  }
  
  // Vérifier data.biTvx ou biV3 avec travaux effectués
  if (intervention.data?.biTvx?.items?.some((item: any) => item.isWorkDone || item.tvxEffectues) ||
      intervention.data?.biV3) {
    return true;
  }
  
  return false;
};

export const isSav = (intervention: any, project?: any): boolean => {
  if (!intervention) return false;
  
  // Vérifier type ou type2
  if (intervention.type?.toLowerCase().includes("sav") ||
      intervention.type2?.toLowerCase().includes("sav")) {
    return true;
  }
  
  // Vérifier history/data
  if (intervention.data?.history?.some((h: any) => 
      h.labelKind?.toLowerCase().includes("sav") || 
      JSON.stringify(h.data || {}).toLowerCase().includes("sav"))) {
    return true;
  }
  
  return false;
};

// ====================================================================
// RÈGLES DE SEGMENTATION APPORTEURS vs PARTICULIERS
// ====================================================================

/**
 * PARTICULIER = CLIENT DIRECT = dossier SANS commanditaireId
 * Un dossier est considéré comme "Particulier" si aucun apporteur n'est associé.
 */
export const isParticulier = (project: any): boolean => {
  if (!project) return false;
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !commanditaireId;
};

/**
 * APPORTEUR = dossier AVEC commanditaireId renseigné
 * Un dossier est considéré comme "Apporteur" si un apporteur est associé.
 */
export const isApporteur = (project: any): boolean => {
  if (!project) return false;
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  return !!commanditaireId;
};

/**
 * Identifie les factures d'initialisation à traiter spécialement.
 * Facture JANVIER 2025 : répartition entre particuliers et apporteurs
 */
export const isInitInvoice = (facture: any, client?: any, project?: any): boolean => {
  if (!facture) return false;
  
  // Identifier la facture de régularisation JANVIER 2025
  if ((client?.displayName?.includes("z_fake") || client?.nom?.includes("z_fake")) &&
      (facture.reference === "MNFA250100001" || facture.numeroFacture === "MNFA250100001")) {
    return true;
  }
  
  return false;
};

/**
 * Valeurs de répartition pour la facture JANVIER 2025
 * - Part PARTICULIERS : 19 419,94 €
 * - Part APPORTEURS : le reste du montant total
 */
export const INIT_INVOICE_PARTICULIERS = 19419.94;

/**
 * Calcule la part APPORTEURS de la facture d'init JANVIER 2025
 */
export const getInitInvoiceApporteursAmount = (facture: any): number => {
  const montantRaw = facture.data?.totalHT || facture.totalHT || "0";
  const montantTotal = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
  
  if (isNaN(montantTotal)) return 0;
  
  // Part apporteurs = montant total - part particuliers
  const partApporteurs = montantTotal - INIT_INVOICE_PARTICULIERS;
  return Math.max(0, partApporteurs); // Éviter les valeurs négatives
};

// ====================================================================
// CALCULS KPI HEADER
// ====================================================================

export const calculateDelaiMoyenDossierFacture = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { delaiMoyen: number; nbFactures: number } => {
  if (!factures || factures.length === 0 || !projects || projects.length === 0) {
    return { delaiMoyen: 0, nbFactures: 0 };
  }

  // Créer un map des projets pour recherche rapide
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  const delais: number[] = [];

  factures.forEach(facture => {
    // 1. Filtrer sur la période (dateEmission ou dateReelle) - optionnel
    const dateFacture = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateFacture) return;

    try {
      const factureDate = parseISO(dateFacture);
      
      // Ne filtrer par période que si dateRange est fourni
      if (dateRange && !isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end })) {
        return;
      }

      // 2. Exclure les avoirs
      const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
      if (typeFacture === "avoir" || typeFacture === "Avoir") return;

      // 3. Trouver le projet associé
      const project = projectsMap.get(facture.projectId);
      if (!project) return;

      const dateCreation = project.created_at || project.createdAt || project.date;
      if (!dateCreation) return;

      // 4. Calculer le délai en jours
      const creationDate = parseISO(dateCreation);
      const delaiJours = differenceInDays(factureDate, creationDate);

      // Ignorer les délais négatifs (erreurs de données)
      if (delaiJours >= 0) {
        delais.push(delaiJours);
      }
    } catch (error) {
      // Ignorer les erreurs de parsing
    }
  });

  if (delais.length === 0) return { delaiMoyen: 0, nbFactures: 0 };

  // Calculer la moyenne
  const delaiMoyen = delais.reduce((sum, d) => sum + d, 0) / delais.length;

  if (import.meta.env.DEV) {
    console.log("⏱️ Délai moyen Dossier → Facture:", {
      delaiMoyen: Math.round(delaiMoyen),
      nbFactures: delais.length,
      min: Math.min(...delais),
      max: Math.max(...delais),
      sansFiltrePeriode: !dateRange
    });
  }

  return { delaiMoyen: Math.round(delaiMoyen), nbFactures: delais.length };
};

export const calculateDossiersJour = (projects: any[], dateRange: { start: Date; end: Date }, userAgency: string): number => {
  if (!projects || projects.length === 0) return 0;
  
  return projects.filter(project => {
    const dateCreation = project.created_at || project.date || project.dateCréationDossier;
    if (!dateCreation) return false;
    
    try {
      const projectDate = parseISO(dateCreation);
      return isWithinInterval(projectDate, { start: dateRange.start, end: dateRange.end });
    } catch {
      return false;
    }
  }).length;
};

export const calculateRtJour = (interventions: any[], dateRange: { start: Date; end: Date }): { nbRT: number; heuresRT: number } => {
  if (!interventions || interventions.length === 0) return { nbRT: 0, heuresRT: 0 };
  
  let nbRT = 0;
  let heuresRT = 0;
  
  interventions.forEach(intervention => {
    const date = intervention.date;
    if (!date) return;
    
    try {
      const interventionDate = parseISO(date);
      if (!isWithinInterval(interventionDate, { start: dateRange.start, end: dateRange.end }) || !isRT(intervention)) return;
      
      nbRT++;
      
      // Extraire le nombre d'heures
      const heures = intervention.data?.biRt?.duree || intervention.data?.heures || intervention.duree || 0;
      const heuresNum = parseFloat(String(heures).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(heuresNum)) {
        heuresRT += heuresNum;
      }
    } catch {
      // Ignorer les dates invalides
    }
  });
  
  return { nbRT, heuresRT };
};

export const calculateDevisJour = (devis: any[], dateRange: { start: Date; end: Date }, userAgency: string): { nbDevis: number; caDevis: number } => {
  if (!devis || devis.length === 0) return { nbDevis: 0, caDevis: 0 };
  
  // Vérifier si on est sur janvier 2025 avec override manuel
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;
  
  let nbDevis = 0;
  let caDevis = 0;
  
  devis.forEach(d => {
    const dateEmission = d.dateEmission || d.dateReelle || d.created_at;
    if (!dateEmission) return;
    
    try {
      const devisDate = parseISO(dateEmission);
      if (isWithinInterval(devisDate, { start: dateRange.start, end: dateRange.end })) {
        nbDevis++;
        
        // Extraire le montant HT du devis
        const montantRaw = d.totalHT || d.data?.totalHT || "0";
        const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
        
        if (!isNaN(montant)) {
          caDevis += montant;
        }
      }
    } catch {
      // Ignorer les dates invalides
    }
  });
  
  return { nbDevis, caDevis };
};

export const calculateCaJour = (factures: any[], clients: any[], projects: any[], dateRange: { start: Date; end: Date }, userAgency: string): { caTotal: number; nbFactures: number } => {
  if (!factures || factures.length === 0) return { caTotal: 0, nbFactures: 0 };
  
  // Vérifier si on est sur janvier 2025 avec override manuel
  const startYear = dateRange.start.getFullYear();
  const startMonth = dateRange.start.getMonth() + 1;
  const endYear = dateRange.end.getFullYear();
  const endMonth = dateRange.end.getMonth() + 1;
  
  if (import.meta.env.DEV) {
    console.log("💶 calculateCaJour - entrée", {
      nbFactures: factures.length,
      dateRange,
    });
  }
  
  // Créer un map des clients et projets pour recherche rapide
  const clientsMap = new Map(clients.map(c => [c.id, c]));
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  let caTotal = 0;
  let facturesDansPeriode = 0;
  let facturesAvecMontantInvalide = 0;
  let facturesExclues = 0;
  let totalAvoirs = 0;
  let totalFactures = 0;
  const exemplesFactures: any[] = [];
  
  factures.forEach(facture => {
    const dateEmission = facture.dateEmission || facture.dateReelle || facture.created_at;
    if (!dateEmission) return;
    
    try {
      const factureDate = parseISO(dateEmission);
      const inRange = isWithinInterval(factureDate, { start: dateRange.start, end: dateRange.end });
      if (!inRange) return;
      facturesDansPeriode++;
      
      // Exclure les factures d'initialisation
      const client = clientsMap.get(facture.clientId);
      const project = projectsMap.get(facture.projectId);
      if (isInitInvoice(facture, client, project)) {
        facturesExclues++;
        return;
      }
      
      // Extraire et valider le montant
      const montantRaw = facture.totalHT || facture.data?.totalHT || "0";
      const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(montant)) {
        facturesAvecMontantInvalide++;
        console.warn("⚠️ Facture avec montant invalide:", {
          ref: facture.reference || facture.numeroFacture,
          totalHT: facture.totalHT,
          dataTotalHT: facture.data?.totalHT,
          montantRaw
        });
        return;
      }
      
      const typeFacture = facture.typeFacture || facture.data?.type || facture.state;
      
      // Garder des exemples pour debug
      if (exemplesFactures.length < 5) {
        exemplesFactures.push({
          ref: facture.reference || facture.numeroFacture,
          montant,
          type: typeFacture,
          totalHT: facture.totalHT,
          dataTotalHT: facture.data?.totalHT
        });
      }
      
      if (typeFacture === "avoir") {
        totalAvoirs += Math.abs(montant);
        caTotal -= Math.abs(montant);
      } else {
        totalFactures += montant;
        caTotal += montant;
      }
    } catch (e) {
      console.warn("Erreur parsing date facture:", e, facture);
    }
  });
  
  const nbFacturesComptabilisees = facturesDansPeriode - facturesExclues - facturesAvecMontantInvalide;
  
  if (import.meta.env.DEV) {
    console.log("💶 calculateCaJour - résultat", { 
      caTotal, 
      facturesDansPeriode,
      facturesAvecMontantInvalide,
      facturesExclues,
      nbFacturesComptabilisees,
      totalFacturesPositives: totalFactures,
      totalAvoirs,
      nbFacturesTotal: factures.length,
      exemplesFactures
    });
  }
  
  return { caTotal, nbFactures: nbFacturesComptabilisees };
};

// ====================================================================
// CALCULS VARIATIONS
// ====================================================================

export const calculateVariationDossiers = (projects: any[], dateRange: { start: Date; end: Date }, userAgency: string): number => {
  if (!projects || projects.length === 0) return 0;
  
  const dossiersActuel = calculateDossiersJour(projects, dateRange, userAgency);
  
  // Calculer la période équivalente précédente
  const periodeDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const previousStart = subDays(dateRange.start, periodeDays);
  const previousEnd = subDays(dateRange.end, periodeDays);
  
  const dossiersPrecedent = calculateDossiersJour(projects, { start: previousStart, end: previousEnd }, userAgency);
  
  if (dossiersPrecedent === 0) return dossiersActuel > 0 ? 100 : 0;
  
  return Math.round(((dossiersActuel - dossiersPrecedent) / dossiersPrecedent) * 100);
};

export const calculateVariationCa = (factures: any[], clients: any[], projects: any[], dateRange: { start: Date; end: Date }, userAgency: string): number => {
  if (!factures || factures.length === 0) return 0;
  
  const { caTotal: caActuel } = calculateCaJour(factures, clients, projects, dateRange, userAgency);
  
  // Calculer la période équivalente précédente
  const periodeDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const previousStart = subDays(dateRange.start, periodeDays);
  const previousEnd = subDays(dateRange.end, periodeDays);
  
  const { caTotal: caPrecedent } = calculateCaJour(factures, clients, projects, { start: previousStart, end: previousEnd }, userAgency);
  
  if (caPrecedent === 0) return caActuel > 0 ? 100 : 0;
  
  return Math.round(((caActuel - caPrecedent) / caPrecedent) * 100);
};

// ====================================================================
// FONCTION PRINCIPALE POUR LE DASHBOARD
// ====================================================================

export const calculateDashboardStats = (
  data: {
    projects: any[];
    interventions: any[];
    factures: any[];
    devis: any[];
    clients: any[];
    users: any[];
  },
  dateRange: { start: Date; end: Date },
  userAgency: string
) => {
  const { projects, interventions, factures, devis, clients, users } = data;
  
  const dossiersJour = calculateDossiersJour(projects, dateRange, userAgency);
  const { nbRT: rtJour, heuresRT } = calculateRtJour(interventions, dateRange);
  const { nbDevis: devisJour, caDevis } = calculateDevisJour(devis, dateRange, userAgency);
  const { caTotal: caJour, nbFactures: nbFacturesCA } = calculateCaJour(factures, clients, projects, dateRange, userAgency);
  
  // KPI 6: Délai moyen dossier → facture
  const { delaiMoyen: delaiMoyenDossier } = calculateDelaiMoyenDossierFacture(factures, projects, dateRange);
  
  // KPI 7: Taux dossiers complexes
  const { tauxComplexite: tauxDossiersComplexes } = calculateTauxDossiersComplexes(interventions, dateRange);
  
  // KPI 8: Nb moyen interventions par dossier
  const { nbMoyen: nbMoyenInterventionsParDossier } = calculateNbMoyenInterventionsParDossier(interventions, dateRange);
  
  // KPI 9: Taux transformation devis (envoyés → acceptés)
  const { tauxTransformation: tauxTransformationDevis } = calculateTauxTransformationDevis(devis, dateRange);
  
  // KPI 10: Panier moyen
  const { panierMoyen } = calculatePanierMoyen(factures, dateRange);
  
  // KPI 11: Nb moyen visites par intervention
  const { nbMoyen: nbMoyenVisitesParIntervention } = calculateNbMoyenVisitesParIntervention(interventions, dateRange);
  
  // KPI 12: Taux dossiers multi-univers
  const { tauxMultiUnivers: tauxDossiersMultiUnivers } = calculateTauxDossiersMultiUnivers(projects, dateRange);
  
  // KPI 13: Taux dossiers sans devis
  const { tauxSansDevis: tauxDossiersSansDevis } = calculateTauxDossiersSansDevis(projects, factures, devis, dateRange);
  
  // KPI 14: Taux dossiers multi-techniciens
  const { tauxMultiTech: tauxDossiersMultiTechniciens } = calculateTauxDossiersMultiTechniciens(interventions, dateRange);
  
  // KPI 15: Polyvalence techniciens
  const { polyvalenceMoyenne: polyvalenceTechniciens } = calculatePolyvalenceTechniciens(interventions, projects, users);
  
  // KPI 16: Délai moyen dossier → premier devis
  const { delaiMoyen: delaiDossierPremierDevis, nbDossiers: nbDossiersAvecDevis } = calculateDelaiMoyenDossierPremierDevis(projects, devis);
  
  return {
    dossiersJour,
    rtJour,
    heuresRT,
    devisJour,
    caDevis,
    caJour,
    nbFacturesCA,
    delaiMoyenDossier,
    tauxDossiersComplexes,
    nbMoyenInterventionsParDossier,
    tauxTransformationDevis,
    panierMoyen,
    nbMoyenVisitesParIntervention,
    tauxDossiersMultiUnivers,
    tauxDossiersSansDevis,
    tauxDossiersMultiTechniciens,
    polyvalenceTechniciens,
    delaiDossierPremierDevis,
    nbDossiersAvecDevis,
    variations: {
      dossiers: calculateVariationDossiers(projects, dateRange, userAgency),
      rt: null, // Non implémenté - null indique l'absence de données
      devis: null, // Non implémenté - null indique l'absence de données
      ca: calculateVariationCa(factures, clients, projects, dateRange, userAgency),
    }
  };
};

// ====================================================================
// KPI 7 - TAUX DE DOSSIERS COMPLEXES
// ====================================================================

export const calculateTauxDossiersComplexes = (
  interventions: any[],
  dateRange?: { start: Date; end: Date }
): { tauxComplexite: number; nbComplexes: number; nbTotal: number } => {
  
  console.log("📊 Dossiers Complexes - START:", {
    nbInterventions: interventions.length,
    typesUniques: [...new Set(interventions.map(i => i.type || i.data?.type))],
    statesUniques: [...new Set(interventions.map(i => i.state || i.data?.state))],
    dateRange: dateRange ? {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    } : "undefined"
  });
  
  // 1) Filtrer les interventions par période si fournie
  let interventionsFiltrees = interventions;
  
  if (dateRange) {
    interventionsFiltrees = interventions.filter(intervention => {
      const date = intervention.date || intervention.data?.date;
      if (!date) return false;
      
      try {
        const interventionDate = parseISO(date);
        return isWithinInterval(interventionDate, dateRange);
      } catch {
        return false;
      }
    });
  }
  
  console.log("📊 Interventions filtrées par période:", interventionsFiltrees.length);
  
  // 2) Compter les interventions par projectId et par type
  const interventionsParProjet: Record<string, { 
    total: number; 
    travaux: number;
  }> = {};
  
  for (const intervention of interventionsFiltrees) {
    const projectId = intervention.projectId || intervention.data?.projectId;
    const type = intervention.type || intervention.data?.type;
    
    if (!projectId) continue;
    
    if (!interventionsParProjet[projectId]) {
      interventionsParProjet[projectId] = { total: 0, travaux: 0 };
    }
    
    interventionsParProjet[projectId].total += 1;
    
    if (type === "travaux") {
      interventionsParProjet[projectId].travaux += 1;
    }
  }
  
  console.log("📊 Projets avec interventions:", Object.keys(interventionsParProjet).length);
  console.log("📊 Exemples interventions par projet:", 
    Object.entries(interventionsParProjet)
      .slice(0, 3)
      .map(([projectId, counts]) => ({ projectId, ...counts }))
  );
  
  // 3) Déterminer les dossiers complexes
  // Un dossier est complexe si :
  // - Plus de 6 interventions au total OU
  // - Au moins 2 interventions de type "travaux"
  const projetsAvecIntervention = Object.keys(interventionsParProjet).length;
  
  const projetsComplexes = Object.values(interventionsParProjet).filter(counts => 
    counts.total > 6 || counts.travaux >= 2
  ).length;
  
  // 4) Calculer le taux
  const tauxComplexite = projetsAvecIntervention > 0
    ? (projetsComplexes / projetsAvecIntervention) * 100
    : 0;
  
  console.log("📊 Dossiers Complexes - RESULT:", {
    tauxComplexite: Math.round(tauxComplexite * 10) / 10,
    projetsComplexes,
    projetsAvecIntervention,
    exemplesDossiersComplexes: Object.entries(interventionsParProjet)
      .filter(([_, counts]) => counts.total > 6 || counts.travaux >= 2)
      .slice(0, 3)
      .map(([projectId, counts]) => ({ 
        projectId, 
        total: counts.total, 
        travaux: counts.travaux,
        raison: counts.total > 6 ? ">6 interventions" : "≥2 travaux"
      }))
  });
  
  return {
    tauxComplexite: Math.round(tauxComplexite * 10) / 10,
    nbComplexes: projetsComplexes,
    nbTotal: projetsAvecIntervention
  };
};

// ====================================================================
// KPI 10 - NOMBRE MOYEN D'INTERVENTIONS PAR DOSSIER
// ====================================================================

export const calculateNbMoyenInterventionsParDossier = (
  interventions: any[],
  dateRange?: { start: Date; end: Date }
): { nbMoyen: number; totalInterventions: number; nbProjets: number } => {
  
  // 1) Filtrer les interventions par période si fournie
  let interventionsFiltrees = interventions;
  
  if (dateRange) {
    interventionsFiltrees = interventions.filter(intervention => {
      const date = intervention.date || intervention.data?.date;
      if (!date) return false;
      
      try {
        const interventionDate = parseISO(date);
        return isWithinInterval(interventionDate, dateRange);
      } catch {
        return false;
      }
    });
  }
  
  // 2) Compter les interventions par projectId
  const nbInterventionsParProjet: Record<string, number> = {};
  
  for (const intervention of interventionsFiltrees) {
    const projectId = intervention.projectId || intervention.data?.projectId;
    
    if (!projectId) continue;
    
    if (!nbInterventionsParProjet[projectId]) {
      nbInterventionsParProjet[projectId] = 0;
    }
    
    nbInterventionsParProjet[projectId] += 1;
  }
  
  // 3) Calculer les statistiques
  const nbProjetsAvecIntervention = Object.keys(nbInterventionsParProjet).length;
  const totalInterventions = Object.values(nbInterventionsParProjet).reduce((sum, count) => sum + count, 0);
  
  const nbMoyen = nbProjetsAvecIntervention > 0
    ? totalInterventions / nbProjetsAvecIntervention
    : 0;
  
  console.log("📊 KPI 10 - Nb Moyen Interventions/Dossier:", {
    nbMoyen: Math.round(nbMoyen * 10) / 10,
    totalInterventions,
    nbProjets: nbProjetsAvecIntervention,
    exemples: Object.entries(nbInterventionsParProjet)
      .slice(0, 3)
      .map(([projectId, count]) => ({ projectId, nbInterventions: count }))
  });
  
  return {
    nbMoyen: Math.round(nbMoyen * 10) / 10, // Arrondir à 1 décimale
    totalInterventions,
    nbProjets: nbProjetsAvecIntervention
  };
};

// ====================================================================
// KPI 11 - NOMBRE MOYEN DE VISITES PAR INTERVENTION
// ====================================================================

export const calculateNbMoyenVisitesParIntervention = (
  interventions: any[],
  dateRange?: { start: Date; end: Date }
): { nbMoyen: number; totalVisites: number; nbInterventions: number } => {
  
  // 1) Filtrer les interventions par période si fournie
  let interventionsFiltrees = interventions ?? [];
  
  if (dateRange) {
    interventionsFiltrees = interventions.filter(intervention => {
      const date = intervention.date || intervention.data?.date;
      if (!date) return false;
      
      try {
        const interventionDate = parseISO(date);
        return isWithinInterval(interventionDate, dateRange);
      } catch {
        return false;
      }
    });
  }
  
  // 2) Aplatir toutes les visites / RDV (version finale corrigée)
  const extractVisites = (it: any) => {
    const v1 = it.visites ?? [];
    const v2 = it.data?.visites ?? [];
    const v3 = it.data?.biDepan?.items ?? [];
    const v4 = it.data?.biTvx?.items ?? [];
    const v5 = it.data?.biRt?.items ?? [];
    
    return [...v1, ...v2, ...v3, ...v4, ...v5];
  };
  
  // 3) Nombre total de visites par intervention
  const visitesCounts = interventionsFiltrees.map(it => {
    const all = extractVisites(it);
    return all.length;
  });
  
  // 4) Interventions ayant au moins 1 visite
  const interventionsAvecVisites = visitesCounts.filter(n => n > 0);
  
  // Debug express
  console.log("🔍 Debug Nb visites/RDV:");
  console.log("  - nb interventions total:", interventionsFiltrees.length);
  console.log("  - nb interventions avec visites:", interventionsAvecVisites.length);
  console.log("  - ex avec visites:", interventionsFiltrees.find(it => extractVisites(it).length > 0));
  
  // Si aucune intervention avec visite → retour 0 (évite NaN)
  if (interventionsAvecVisites.length === 0) {
    console.log("  ⚠️ Aucune intervention avec visite → retour 0");
    return {
      nbMoyen: 0,
      totalVisites: 0,
      nbInterventions: 0
    };
  }
  
  // 5) Nombre moyen visites / RDV
  const totalVisites = visitesCounts.reduce((acc, n) => acc + n, 0);
  const nbMoyenVisites = totalVisites / interventionsAvecVisites.length;
  
  // Arrondi à 2 décimales
  const nbMoyen = Number(nbMoyenVisites.toFixed(2));
  
  console.log("📊 KPI 11 - Nb Moyen Visites/RDV:", {
    nbMoyen,
    totalVisites,
    nbInterventions: interventionsAvecVisites.length
  });
  
  return {
    nbMoyen,
    totalVisites,
    nbInterventions: interventionsAvecVisites.length
  };
};

// ====================================================================
// KPI 12 - TAUX DE DOSSIERS MULTI-UNIVERS
// ====================================================================

export const calculateTauxDossiersMultiUnivers = (
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { tauxMultiUnivers: number; nbMultiUnivers: number; nbTotal: number } => {
  
  // 1) Filtrer les projets par période si fournie
  let projectsFiltres = projects;
  
  if (dateRange) {
    projectsFiltres = projects.filter(project => {
      const date = project.createdAt || project.data?.createdAt;
      if (!date) return false;
      
      try {
        const projectDate = parseISO(date);
        return isWithinInterval(projectDate, dateRange);
      } catch {
        return false;
      }
    });
  }
  
  // 2) Compter les univers par projet
  let projetsAvecUnivers = 0;
  let projetsMultiUnivers = 0;
  
  for (const project of projectsFiltres) {
    const universes = project.universes || project.data?.universes || [];
    const nbUnivers = universes.length;
    
    if (nbUnivers >= 1) {
      projetsAvecUnivers += 1;
      
      if (nbUnivers >= 2) {
        projetsMultiUnivers += 1;
      }
    }
  }
  
  // 3) Calculer le taux
  const tauxMultiUnivers = projetsAvecUnivers > 0
    ? (projetsMultiUnivers / projetsAvecUnivers) * 100
    : 0;
  
  console.log("📊 KPI 12 - Taux Multi-Univers:", {
    tauxMultiUnivers: Math.round(tauxMultiUnivers * 10) / 10,
    projetsMultiUnivers,
    projetsAvecUnivers
  });
  
  return {
    tauxMultiUnivers: Math.round(tauxMultiUnivers * 10) / 10,
    nbMultiUnivers: projetsMultiUnivers,
    nbTotal: projetsAvecUnivers
  };
};

// ====================================================================
// KPI 13 - TAUX DE DOSSIERS SANS DEVIS (INTERVENTIONS DIRECTES)
// ====================================================================

export const calculateTauxDossiersSansDevis = (
  projects: any[],
  factures: any[],
  devis: any[],
  dateRange?: { start: Date; end: Date }
): { tauxSansDevis: number; nbSansDevis: number; nbFactures: number } => {
  
  // 1) Set des projectId facturés (factures définitives)
  const projetsFactures = new Set<string>();
  
  for (const facture of factures) {
    const type = facture.type || facture.data?.type;
    if (type?.toLowerCase() === "avoir") continue;
    
    // Filtrer par période si fournie
    if (dateRange) {
      const date = facture.dateEmission || facture.dateReelle || facture.date || facture.data?.dateEmission || facture.data?.dateReelle;
      if (!date) continue;
      
      try {
        const factureDate = parseISO(date);
        if (!isWithinInterval(factureDate, dateRange)) {
          continue;
        }
      } catch {
        continue;
      }
    }
    
    const projectId = facture.projectId || facture.data?.projectId;
    if (projectId) {
      projetsFactures.add(projectId);
    }
  }
  
  // 2) Set des projectId avec devis
  const projetsAvecDevis = new Set<string>();
  
  for (const d of devis) {
    // Filtrer par période si fournie
    if (dateRange) {
      const date = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date;
      if (!date) continue;
      
      try {
        const devisDate = parseISO(date);
        if (!isWithinInterval(devisDate, dateRange)) {
          continue;
        }
      } catch {
        continue;
      }
    }
    
    const projectId = d.projectId || d.data?.projectId;
    if (projectId) {
      projetsAvecDevis.add(projectId);
    }
  }
  
  // 3) Dossiers facturés sans devis
  const projetsFacturesSansDevis = new Set(
    [...projetsFactures].filter(pid => !projetsAvecDevis.has(pid))
  );
  
  // 4) Calculer le taux
  const nbFactures = projetsFactures.size;
  const nbSansDevis = projetsFacturesSansDevis.size;
  const tauxSansDevis = nbFactures > 0
    ? (nbSansDevis / nbFactures) * 100
    : 0;
  
  console.log("📊 KPI 13 - Taux Sans Devis:", {
    tauxSansDevis: Math.round(tauxSansDevis * 10) / 10,
    nbSansDevis,
    nbFactures,
    exemplesProjectsSansDevis: [...projetsFacturesSansDevis].slice(0, 3)
  });
  
  return {
    tauxSansDevis: Math.round(tauxSansDevis * 10) / 10,
    nbSansDevis,
    nbFactures
  };
};

// ====================================================================
// KPI 14 - TAUX DE DOSSIERS MULTI-TECHNICIENS
// ====================================================================

export const calculateTauxDossiersMultiTechniciens = (
  interventions: any[],
  dateRange?: { start: Date; end: Date }
): { tauxMultiTech: number; nbMultiTech: number; nbTotal: number } => {
  
  // 1) Extraction des techniciens pour chaque intervention (version complète)
  const extractUsers = (it: any): Set<string> => {
    const techs = new Set<string>();

    // 1) visites racine
    (it.visites ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    // 2) data.visites
    (it.data?.visites ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    // 3) blocs BI (Depan, Tvx, Rt)
    (it.data?.biDepan?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    (it.data?.biTvx?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    (it.data?.biRt?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    return techs;
  };
  
  // 2) Techniciens par projet
  const techsParProjet: Record<string, Set<string>> = {};

  for (const it of interventions ?? []) {
    const pid = it.projectId ?? it.data?.projectId;
    if (!pid) continue;

    if (!techsParProjet[pid]) techsParProjet[pid] = new Set<string>();

    const techs = extractUsers(it);
    techs.forEach(u => techsParProjet[pid].add(u));
  }

  // 3) Comptage mono / multi
  const projets = Object.keys(techsParProjet);

  const projetsAvecTech = projets.filter(pid => techsParProjet[pid].size >= 1);
  const projetsMultiTech = projets.filter(pid => techsParProjet[pid].size >= 2);

  const tauxMultiTechniciens = projetsAvecTech.length === 0
    ? 0
    : (projetsMultiTech.length / projetsAvecTech.length) * 100;

  const tauxMultiTech = Number(tauxMultiTechniciens.toFixed(2));
  
  console.log("📊 KPI 14 - Taux Multi-Techniciens:", {
    tauxMultiTech,
    projetsMultiTech: projetsMultiTech.length,
    projetsAvecTech: projetsAvecTech.length,
    exemples: projetsMultiTech.slice(0, 3).map(pid => ({
      projectId: pid,
      nbTechs: techsParProjet[pid].size
    }))
  });
  
  return {
    tauxMultiTech,
    nbMultiTech: projetsMultiTech.length,
    nbTotal: projetsAvecTech.length
  };
};

// ====================================================================
// KPI 15 - POLYVALENCE RÉELLE DES TECHNICIENS (UNIVERS)
// ====================================================================

export const calculatePolyvalenceTechniciens = (
  interventions: any[],
  projects: any[],
  users: any[]
): { polyvalenceMoyenne: number; nbTechniciens: number; detailsTechs: Array<{ techId: string; nom: string; nbUnivers: number }> } => {
  
  // 1) Helper - Extraction des univers d'un projet
  const extractUnivers = (project: any): string[] => {
    return project?.universes ?? project?.data?.universes ?? [];
  };

  // 2) Helper - Extraction des techniciens d'une intervention (même logique que KPI 14)
  const extractUsers = (it: any): Set<string> => {
    const techs = new Set<string>();

    // visites racine
    (it.visites ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    // data.visites
    (it.data?.visites ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    // blocs BI (Depan, Tvx, Rt)
    (it.data?.biDepan?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    (it.data?.biTvx?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    (it.data?.biRt?.items ?? []).forEach((v: any) => {
      (v.usersIds ?? []).forEach((u: string) => techs.add(u));
    });

    return techs;
  };

  // 3) Indexer les projets par id
  const projectById: Record<string, any> = {};
  projects.forEach(p => {
    const id = p.id ?? p.data?.id;
    if (id) {
      projectById[id] = p;
    }
  });

  // 4) Construire univers par technicien
  const universParTech: Record<string, Set<string>> = {};

  for (const it of interventions) {
    const pid = it.projectId ?? it.data?.projectId;
    if (!pid) continue;

    const project = projectById[pid];
    if (!project) continue;

    const univers = extractUnivers(project);
    if (!univers || univers.length === 0) continue;

    const techs = extractUsers(it);
    if (techs.size === 0) continue;

    techs.forEach(techId => {
      if (!universParTech[techId]) {
        universParTech[techId] = new Set();
      }
      univers.forEach(u => universParTech[techId].add(u));
    });
  }

  // 5) Indexer les users pour récupérer les noms
  const usersMap: Record<string, any> = {};
  for (const user of users) {
    const id = user.id ?? user.data?.id;
    if (id) {
      usersMap[id] = user;
    }
  }

  // 6) Transformer en résultats par technicien
  const resultParTech = Object.entries(universParTech).map(([techId, setUnivers]) => {
    const user = usersMap[techId];
    const firstname = user?.firstname ?? user?.data?.firstname ?? "";
    const lastname = user?.lastname ?? user?.data?.lastname ?? "";
    const nom = `${firstname} ${lastname}`.trim() || techId;

    return {
      techId,
      nom,
      nbUnivers: setUnivers.size
    };
  });

  // Trier par nombre d'univers décroissant
  resultParTech.sort((a, b) => b.nbUnivers - a.nbUnivers);

  // 7) Polyvalence moyenne globale
  if (resultParTech.length === 0) {
    console.log("📊 KPI 15 - Polyvalence Techniciens:", {
      polyvalenceMoyenne: 0,
      nbTechniciens: 0,
      top5: []
    });
    
    return {
      polyvalenceMoyenne: 0,
      nbTechniciens: 0,
      detailsTechs: []
    };
  }

  const sommeUnivers = resultParTech.reduce((acc, t) => acc + t.nbUnivers, 0);
  const polyvalenceMoyenne = sommeUnivers / resultParTech.length;

  console.log("📊 KPI 15 - Polyvalence Techniciens:", {
    polyvalenceMoyenne: Number(polyvalenceMoyenne.toFixed(2)),
    nbTechniciens: resultParTech.length,
    top5: resultParTech.slice(0, 5)
  });

  return {
    polyvalenceMoyenne: Number(polyvalenceMoyenne.toFixed(2)),
    nbTechniciens: resultParTech.length,
    detailsTechs: resultParTech
  };
};

// ====================================================================
// KPI 8 - PANIER MOYEN PAR DOSSIER FACTURÉ
// ====================================================================

export const calculatePanierMoyen = (
  factures: any[],
  dateRange?: { start: Date; end: Date }
): { panierMoyen: number; caTotal: number; nbDossiers: number } => {
  const projectsFactures = new Set<string>();
  let caTotal = 0;
  let facturesDebug: any[] = [];
  let facturesRejected = 0;
  let facturesAccepted = 0;

  console.log("🛒 Panier Moyen - START", {
    totalFactures: factures.length,
    dateRange: dateRange ? {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    } : "undefined"
  });

  factures.forEach(facture => {
    // 1. Filtrer les factures définitives (exclure les avoirs)
    const type = facture.type || facture.data?.type;
    if (type?.toLowerCase() === "avoir") return;

    // 2. Filtrer par date si dateRange fourni
    if (dateRange) {
      const dateEmission = facture.dateReelle || facture.dateEmission || facture.date || facture.data?.dateReelle || facture.data?.dateEmission;
      if (!dateEmission) {
        facturesRejected++;
        return;
      }

      try {
        const factureDate = parseISO(dateEmission);
        if (isNaN(factureDate.getTime())) {
          facturesRejected++;
          if (facturesRejected <= 3) {
            console.log("🛒 Facture REJETÉE (date parse failed):", { 
              dateEmission, 
              ref: facture.reference || facture.numeroFacture 
            });
          }
          return;
        }
        
        if (!isWithinInterval(factureDate, dateRange)) {
          facturesRejected++;
          if (facturesRejected <= 3) {
            console.log("🛒 Facture REJETÉE (hors période):", { 
              dateEmission,
              factureDate: factureDate.toISOString(),
              dateRangeStart: dateRange.start.toISOString(),
              dateRangeEnd: dateRange.end.toISOString(),
              ref: facture.reference || facture.numeroFacture 
            });
          }
          return;
        }
        
        facturesAccepted++;
      } catch (error) {
        facturesRejected++;
        if (facturesRejected <= 3) {
          console.log("🛒 Facture REJETÉE (exception):", { 
            dateEmission, 
            error: String(error),
            ref: facture.reference || facture.numeroFacture 
          });
        }
        return;
      }
    }

    // 3. Récupérer le projectId
    const projectId = facture.projectId || facture.data?.projectId;
    if (!projectId) return;

    // 4. Ajouter au set des projets facturés
    projectsFactures.add(projectId);

    // 5. Cumuler le CA HT (même logique que calculateCaJour)
    const montantRaw = facture.data?.totalHT || facture.totalHT || facture.montantHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ''));
    
    // Debug: garder les 3 premières factures pour inspection
    if (facturesDebug.length < 3) {
      facturesDebug.push({
        ref: facture.reference || facture.numeroFacture,
        montantRaw,
        montant,
        dataTotalHT: facture.data?.totalHT,
        totalHT: facture.totalHT,
        montantHT: facture.montantHT
      });
    }
    
    if (!isNaN(montant)) {
      caTotal += montant;
    }
  });

  // 6. Calculer le panier moyen
  const nbDossiers = projectsFactures.size;
  const panierMoyen = nbDossiers > 0 ? caTotal / nbDossiers : 0;

  console.log("🛒 Panier Moyen - RESULT:", {
    panierMoyen: Math.round(panierMoyen * 100) / 100,
    caTotal: Math.round(caTotal * 100) / 100,
    nbDossiers,
    facturesAccepted,
    facturesRejected,
    exemplesFactures: facturesDebug.slice(0, 2)
  });

  return {
    panierMoyen: Math.round(panierMoyen * 100) / 100, // Arrondir à 2 décimales
    caTotal: Math.round(caTotal * 100) / 100,
    nbDossiers
  };
};

// ====================================================================
// KPI 9 - TAUX DE TRANSFORMATION DES DEVIS
// ====================================================================

export const calculateTauxTransformationDevis = (
  devis: any[],
  dateRange?: { start: Date; end: Date }
): { tauxTransformation: number; nbEnvoyes: number; nbAcceptes: number } => {
  // Filtrer les devis par période si fournie
  let devisPeriode = devis;
  
  if (dateRange) {
    devisPeriode = devis.filter(d => {
      const date = d.dateReelle || d.date || d.dateCreation || d.data?.dateReelle || d.data?.date;
      if (!date) return false;

      try {
        const devisDate = parseISO(date);
        return isWithinInterval(devisDate, dateRange);
      } catch {
        return false;
      }
    });
  }

  // Devis envoyés = state === "sent" (ou acceptés/facturés qui ont forcément été envoyés)
  const devisEnvoyes = devisPeriode.filter(d => {
    const state = d.state || d.statut || d.data?.state || d.data?.statut;
    const stateStr = String(state).toLowerCase();
    return stateStr === "sent" || stateStr === "accepted" || stateStr === "invoice";
  });

  // Devis acceptés = state === "invoice" ou "accepted"
  const devisAcceptes = devisPeriode.filter(d => {
    const state = d.state || d.statut || d.data?.state || d.data?.statut;
    const stateStr = String(state).toLowerCase();
    return stateStr === "invoice" || stateStr === "accepted";
  });

  const nbEnvoyes = devisEnvoyes.length;
  const nbAcceptes = devisAcceptes.length;

  // Calculer le taux
  const tauxTransformation = nbEnvoyes > 0 
    ? (nbAcceptes / nbEnvoyes) * 100 
    : 0;

  return {
    tauxTransformation: Math.round(tauxTransformation * 10) / 10, // Arrondir à 1 décimale
    nbEnvoyes,
    nbAcceptes
  };
};

// ====================================================================
// KPI 16 - DÉLAI MOYEN DOSSIER → PREMIER DEVIS
// ====================================================================

/**
 * Parser pour les dates françaises "dd/MM/yyyy HH:mm:ss"
 */
function parseHistoryDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format attendu: "09/02/2025 22:00:50"
  const [datePart, timePart] = dateStr.split(" ");
  if (!datePart) return null;
  
  const [day, month, year] = datePart.split("/");
  if (!day || !month || !year) return null;
  
  // Construire une date ISO: "2025-02-09T22:00:50"
  const isoStr = `${year}-${month}-${day}${timePart ? "T" + timePart : ""}`;
  const date = new Date(isoStr);
  
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculer le délai moyen entre ouverture dossier et envoi du premier devis
 * BASÉ SUR L'HISTORIQUE DES INTERVENTIONS
 */
export function calculateDelaiMoyenDossierPremierDevis(
  projects: any[],
  interventions: any[]
): { delaiMoyen: number; nbDossiers: number } {
  // DEBUG EXHAUSTIF
  console.log("📊 KPI 16 - Nb interventions:", interventions.length);
  console.log("📊 KPI 16 - Nb projets:", projects.length);
  
  if (projects.length > 0) {
    console.log("📊 KPI 16 - Première projet keys:", Object.keys(projects[0]));
    console.log("📊 KPI 16 - project.date existe:", !!projects[0].date);
    console.log("📊 KPI 16 - project.created_at existe:", !!projects[0].created_at);
    console.log("📊 KPI 16 - project.createdAt existe:", !!projects[0].createdAt);
  }
  
  if (interventions.length > 0) {
    const firstIt = interventions[0];
    console.log("📊 KPI 16 - Première intervention keys:", Object.keys(firstIt));
    console.log("📊 KPI 16 - intervention.history existe:", !!firstIt.history);
    console.log("📊 KPI 16 - intervention.data?.history existe:", !!firstIt.data?.history);
    
    // Vérifier les deux chemins
    const historyDirect = interventions.filter(it => Array.isArray(it.history) && it.history.length > 0).length;
    const historyNested = interventions.filter(it => Array.isArray(it.data?.history) && it.data.history.length > 0).length;
    console.log("📊 KPI 16 - intervention.history count:", historyDirect);
    console.log("📊 KPI 16 - intervention.data.history count:", historyNested);

    // Collecter tous les labelKind pour debug
    const allLabels = new Set<string>();
    interventions.forEach(it => {
      const history = it.data?.history ?? it.history ?? [];
      if (Array.isArray(history)) {
        history.forEach((h: any) => {
          if (h.labelKind) allLabels.add(h.labelKind);
        });
      }
    });
    console.log("📊 KPI 16 - Tous les labelKind:", Array.from(allLabels));
  }

  // Étape 1 : Indexer les projets par ID
  const projectById: Record<string, any> = {};
  projects.forEach(p => {
    if (p.id) projectById[p.id] = p;
  });

  // Étape 2 : Map projectId -> date du 1er envoi de devis (recherche dans intervention.data.history)
  const firstDevisSentByProject: Record<string, Date> = {};

  for (const intervention of interventions) {
    const pid = intervention.projectId;
    if (!pid) continue;

    // PRIORISER intervention.data.history puis fallback sur intervention.history
    const history = intervention.data?.history ?? intervention.history ?? [];
    if (!Array.isArray(history) || history.length === 0) continue;

    for (const event of history) {
      const labelKind = event.labelKind || "";
      
      // Condition stricte UNIQUEMENT
      if (labelKind === "Devis à faire => Devis envoyé") {
        const eventDate = parseHistoryDate(event.dateModif);
        if (!eventDate) continue;

        const existing = firstDevisSentByProject[pid];
        if (!existing || eventDate < existing) {
          firstDevisSentByProject[pid] = eventDate;
          console.log(`📊 KPI 16 - Trouvé devis envoyé pour projet ${pid}:`, event.dateModif);
        }
      }
    }
  }

  console.log("📊 KPI 16 - Projets avec devis envoyé:", Object.keys(firstDevisSentByProject).length);

  // Étape 3 : Calcul des délais (utiliser project.date ou project.created_at)
  const delais: number[] = [];

  for (const [projectId, dateFirstDevis] of Object.entries(firstDevisSentByProject)) {
    const project = projectById[projectId];
    if (!project) continue;

    // Date de création avec PRIORITÉ sur project.date puis project.created_at
    const rawDate = project.date || project.created_at || project.createdAt;
    if (!rawDate) {
      console.log(`📊 KPI 16 - Projet ${projectId} sans date de création`);
      continue;
    }
    
    const dateCreation = new Date(rawDate);
    if (isNaN(dateCreation.getTime())) {
      console.log(`📊 KPI 16 - Projet ${projectId} date invalide:`, rawDate);
      continue;
    }

    const diffJours = (dateFirstDevis.getTime() - dateCreation.getTime()) / (1000 * 3600 * 24);

    if (diffJours >= 0 && diffJours < 10000) {
      delais.push(diffJours);
      console.log(`📊 KPI 16 - Projet ${projectId}: délai = ${diffJours.toFixed(1)} jours`);
    }
  }

  console.log("📊 KPI 16 - Dossiers avec délai calculé:", delais.length);
  if (delais.length > 0) {
    console.log("📊 KPI 16 - Exemples de délais (premiers 5):", delais.slice(0, 5).map(d => d.toFixed(1)));
  }

  // Étape 4 : KPI final
  if (delais.length === 0) {
    return { delaiMoyen: 0, nbDossiers: 0 };
  }

  const somme = delais.reduce((acc, v) => acc + v, 0);
  const delaiMoyen = somme / delais.length;

  return {
    delaiMoyen: Number(delaiMoyen.toFixed(1)),
    nbDossiers: delais.length
  };
}
