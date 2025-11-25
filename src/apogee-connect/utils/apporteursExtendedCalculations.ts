import { parseISO, isWithinInterval } from "date-fns";

/**
 * Parse une date depuis un format ISO ou français DD/MM/YYYY
 */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  try {
    // Essayer format ISO d'abord
    if (dateStr.includes('T') || dateStr.includes('-')) {
      return parseISO(dateStr);
    }
    
    // Essayer format français DD/MM/YYYY
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split(' ')[0].split('/');
      if (day && month && year) {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    
    // Fallback
    return new Date(dateStr);
  } catch {
    return null;
  }
};

/**
 * KPI 6: Nombre d'apporteurs actifs (ayant généré au moins une facture sur la période)
 */
export const calculateApporteursActifs = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { nbActifs: number } => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const apporteursActifs = new Set<string>();

  factures.forEach((facture) => {
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    if (dateRange) {
      const dateStr = facture.dateEmission || facture.dateReelle || facture.date || facture.created_at;
      if (!dateStr) return;
      const date = parseDate(dateStr);
      if (!date || date < dateRange.start || date > dateRange.end) return;
    }

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (commanditaireId) {
      apporteursActifs.add(commanditaireId);
    }
  });

  return { nbActifs: apporteursActifs.size };
};

/**
 * KPI 7: CA moyen par apporteur
 */
export const calculateCAMoyenParApporteur = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { caMoyen: number; caTotal: number; nbApporteurs: number } => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  const caParApporteur = new Map<string, number>();

  factures.forEach((facture) => {
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    if (dateRange) {
      const dateStr = facture.dateEmission || facture.dateReelle || facture.date || facture.created_at;
      if (!dateStr) return;
      const date = parseDate(dateStr);
      if (!date || date < dateRange.start || date > dateRange.end) return;
    }

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!commanditaireId) return;

    const montantRaw = facture.totalHT || facture.montantHT || facture.data?.totalHT || facture.data?.montantHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ""));
    if (isNaN(montant)) return;

    const current = caParApporteur.get(commanditaireId) || 0;
    caParApporteur.set(commanditaireId, current + montant);
  });

  const caTotal = Array.from(caParApporteur.values()).reduce((sum, ca) => sum + ca, 0);
  const nbApporteurs = caParApporteur.size;
  const caMoyen = nbApporteurs > 0 ? caTotal / nbApporteurs : 0;

  return { caMoyen: Math.round(caMoyen), caTotal, nbApporteurs };
};

/**
 * KPI 8: Délai moyen de paiement (jours entre dateEmission et premier paiement)
 */
export const calculateDelaiMoyenPaiement = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { delaiMoyen: number; nbFactures: number } => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  let totalDelai = 0;
  let nbFacturesPayees = 0;

  factures.forEach((facture) => {
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    if (dateRange) {
      const dateStr = facture.dateEmission || facture.dateReelle || facture.date || facture.created_at;
      if (!dateStr) return;
      const date = parseDate(dateStr);
      if (!date || date < dateRange.start || date > dateRange.end) return;
    }

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!commanditaireId) return;

    // Date d'émission de la facture
    const dateEmissionStr = facture.dateEmission || facture.dateReelle || facture.date;
    if (!dateEmissionStr) return;
    
    const dateEmission = parseDate(dateEmissionStr);
    if (!dateEmission) return;

    // Récupérer le premier paiement depuis data.tmpSaveRegV0.payments[0].date
    const payments = facture.data?.tmpSaveRegV0?.payments || [];
    if (payments.length === 0) return;

    const premierPaiement = payments[0];
    if (!premierPaiement || !premierPaiement.date) return;

    const datePaiement = parseDate(premierPaiement.date);
    if (!datePaiement || datePaiement < dateEmission) return;

    const delaiJours = Math.round((datePaiement.getTime() - dateEmission.getTime()) / (1000 * 60 * 60 * 24));
    totalDelai += delaiJours;
    nbFacturesPayees++;
  });

  const delaiMoyen = nbFacturesPayees > 0 ? Math.round(totalDelai / nbFacturesPayees) : 0;

  return { delaiMoyen, nbFactures: nbFacturesPayees };
};

/**
 * KPI 9: Taux de fidélité (apporteurs présents période N et N-1)
 */
export const calculateTauxFidelite = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { tauxFidelite: number; nbRecurrents: number; nbTotal: number } => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  // Apporteurs période actuelle
  const apporteursPeriodeN = new Set<string>();
  
  // Apporteurs période N-1 (même durée avant la période actuelle)
  const apporteursPeriodeN1 = new Set<string>();
  
  let dateRangeN1: { start: Date; end: Date } | undefined;
  
  if (dateRange) {
    const dureePeriode = dateRange.end.getTime() - dateRange.start.getTime();
    dateRangeN1 = {
      start: new Date(dateRange.start.getTime() - dureePeriode),
      end: new Date(dateRange.start.getTime() - 1)
    };
  }

  factures.forEach((facture) => {
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    const dateStr = facture.dateEmission || facture.dateReelle || facture.date || facture.created_at;
    if (!dateStr) return;
    const date = parseDate(dateStr);
    if (!date) return;

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!commanditaireId) return;

    // Période actuelle
    if (dateRange && date >= dateRange.start && date <= dateRange.end) {
      apporteursPeriodeN.add(commanditaireId);
    }

    // Période N-1
    if (dateRangeN1 && date >= dateRangeN1.start && date <= dateRangeN1.end) {
      apporteursPeriodeN1.add(commanditaireId);
    }

    // Sans filtre de période, tous les apporteurs sont dans N
    if (!dateRange) {
      apporteursPeriodeN.add(commanditaireId);
    }
  });

  // Apporteurs récurrents = présents dans les deux périodes
  const apporteursRecurrents = new Set(
    Array.from(apporteursPeriodeN).filter(id => apporteursPeriodeN1.has(id))
  );

  const nbTotal = apporteursPeriodeN.size;
  const nbRecurrents = apporteursRecurrents.size;
  const tauxFidelite = nbTotal > 0 ? Math.round((nbRecurrents / nbTotal) * 100) : 0;

  return { tauxFidelite, nbRecurrents, nbTotal };
};

/**
 * KPI 10: Croissance CA (vs période N-1)
 */
export const calculateCroissanceCA = (
  factures: any[],
  projects: any[],
  dateRange?: { start: Date; end: Date }
): { croissance: number; caPeriodeN: number; caPeriodeN1: number } => {
  const projectsMap = new Map(projects.map(p => [p.id, p]));
  
  let caPeriodeN = 0;
  let caPeriodeN1 = 0;
  
  let dateRangeN1: { start: Date; end: Date } | undefined;
  
  if (dateRange) {
    const dureePeriode = dateRange.end.getTime() - dateRange.start.getTime();
    dateRangeN1 = {
      start: new Date(dateRange.start.getTime() - dureePeriode),
      end: new Date(dateRange.start.getTime() - 1)
    };
  }

  factures.forEach((facture) => {
    const typeFacture = (facture.type || facture.typeFacture || facture.data?.type || facture.state || "").toLowerCase();
    if (typeFacture === "avoir") return;

    const dateStr = facture.dateEmission || facture.dateReelle || facture.date || facture.created_at;
    if (!dateStr) return;
    const date = parseDate(dateStr);
    if (!date) return;

    const project = projectsMap.get(facture.projectId);
    if (!project) return;

    const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
    if (!commanditaireId) return;

    const montantRaw = facture.totalHT || facture.montantHT || facture.data?.totalHT || facture.data?.montantHT || "0";
    const montant = parseFloat(String(montantRaw).replace(/[^0-9.-]/g, ""));
    if (isNaN(montant)) return;

    // Période actuelle
    if (dateRange && date >= dateRange.start && date <= dateRange.end) {
      caPeriodeN += montant;
    }

    // Période N-1
    if (dateRangeN1 && date >= dateRangeN1.start && date <= dateRangeN1.end) {
      caPeriodeN1 += montant;
    }

    // Sans filtre, tout va dans N
    if (!dateRange) {
      caPeriodeN += montant;
    }
  });

  const croissance = caPeriodeN1 > 0 
    ? Math.round(((caPeriodeN - caPeriodeN1) / caPeriodeN1) * 100) 
    : 0;

  return { croissance, caPeriodeN: Math.round(caPeriodeN), caPeriodeN1: Math.round(caPeriodeN1) };
};
