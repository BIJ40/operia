/**
 * Calcul centralisé du délai de paiement dossier - SOURCE UNIQUE DE VÉRITÉ
 * Mesure le temps entre facturation et clôture du dossier
 * Utilisé par: StatIA, dashboardCalculations, comparatifAgencesEngine
 */

// Parser une date au format "dd/MM/yyyy HH:mm:ss" (format Apogée history)
function parseDateModifApogee(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format: "14/02/2025 11:19:54"
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  
  return isNaN(date.getTime()) ? null : date;
}

export interface DelaiPaiementDossierResult {
  moyenne: number | null;
  mediane: number | null;
  nbDossiersValides: number;
  min: number | null;
  max: number | null;
  debug: {
    total: number;
    horsPeriode: number;
    canceled: number;
    noFacturationDate: number;
    noClosDate: number;
    negativeDelai: number;
    outliers: number;
    ok: number;
  };
}

export interface DelaiPaiementDossierOptions {
  dateStart?: Date;
  dateEnd?: Date;
  maxDelaiJours?: number; // Par défaut 365 jours
  debug?: boolean;
}

/**
 * Récupère la date de facturation d'un projet
 * Priorité: dateStateFacture > premier event "=> Facturé"
 */
function getFacturationDate(project: any): Date | null {
  // Priorité 1: dateStateFacture
  if (project.dateStateFacture) {
    const raw = String(project.dateStateFacture);

    // Si c'est au format Apogée "dd/MM/yyyy HH:mm:ss"
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(raw)) {
      const date = parseDateModifApogee(raw);
      if (date) return date;
    }

    // Sinon on tente en ISO
    const isoDate = new Date(raw);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    // Si c'est invalide on ne return pas, on retombe sur l'historique
  }
  
  // Priorité 2: Premier event history avec "=> Facturé"
  const history = project.data?.history;
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }
  
  // Chercher le PREMIER événement "=> Facturé"
  const facturationEvent = history.find((h: any) => {
    if (h.kind !== 2) return false;
    const labelKind = String(h.labelKind || '');
    return labelKind.includes('=> Facturé');
  });
  
  if (!facturationEvent?.dateModif) {
    return null;
  }
  
  return parseDateModifApogee(facturationEvent.dateModif);
}

/**
 * Récupère la date de clôture d'un projet
 * Prend le DERNIER event terminant par "=> Clos"
 */
function getClosDate(project: any): Date | null {
  const history = project.data?.history;
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }
  
  // Filtrer tous les événements "=> Clos"
  const closEvents = history.filter((h: any) => {
    if (h.kind !== 2) return false;
    const labelKind = String(h.labelKind || '').trim();
    return labelKind.endsWith('=> Clos');
  });
  
  if (closEvents.length === 0) {
    return null;
  }
  
  // Prendre le DERNIER (chronologiquement, dernier dans l'array)
  const lastClosEvent = closEvents[closEvents.length - 1];
  if (!lastClosEvent?.dateModif) {
    return null;
  }
  
  return parseDateModifApogee(lastClosEvent.dateModif);
}

/**
 * Calcule le délai de paiement en jours pour un projet
 */
function computePaymentDelayDays(project: any): number | null {
  const dateFacture = getFacturationDate(project);
  const dateClos = getClosDate(project);
  
  if (!dateFacture || !dateClos) {
    return null;
  }
  
  const diffMs = dateClos.getTime() - dateFacture.getTime();
  
  // Ignorer les délais négatifs (incohérence de données)
  if (diffMs < 0) {
    return null;
  }
  
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcule la médiane d'un tableau de nombres
 */
function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

/**
 * Calcule le délai moyen de paiement (facturation → clôture dossier)
 * Règles:
 * - Date facturation: dateStateFacture sinon premier event "=> Facturé"
 * - Date clôture: dernier event "=> Clos"
 * - Exclut les délais > maxDelaiJours (outliers)
 * - Exclut les délais négatifs
 * - Filtre par période basé sur la date de facturation
 */
export function calculateDelaiPaiementDossier(
  projects: any[],
  options: DelaiPaiementDossierOptions = {}
): DelaiPaiementDossierResult {
  const { 
    dateStart, 
    dateEnd, 
    maxDelaiJours = 365,
    debug = false 
  } = options;

  const debugStats = {
    total: projects.length,
    horsPeriode: 0,
    canceled: 0,
    noFacturationDate: 0,
    noClosDate: 0,
    negativeDelai: 0,
    outliers: 0,
    ok: 0
  };

  const delais: number[] = [];

  for (const project of projects) {
    // Exclure les dossiers annulés
    const state = String(project.state || '').toLowerCase();
    if (state === 'canceled' || state === 'cancelled') {
      debugStats.canceled++;
      continue;
    }

    // Récupérer la date de facturation
    const dateFacture = getFacturationDate(project);
    if (!dateFacture) {
      debugStats.noFacturationDate++;
      continue;
    }

    // Filtrer par période (basé sur date de facturation)
    if (dateStart && dateFacture < dateStart) {
      debugStats.horsPeriode++;
      continue;
    }
    if (dateEnd && dateFacture > dateEnd) {
      debugStats.horsPeriode++;
      continue;
    }

    // Récupérer la date de clôture
    const dateClos = getClosDate(project);
    if (!dateClos) {
      debugStats.noClosDate++;
      continue;
    }

    // Calculer le délai
    const diffMs = dateClos.getTime() - dateFacture.getTime();
    
    // Ignorer les délais négatifs
    if (diffMs < 0) {
      debugStats.negativeDelai++;
      continue;
    }
    
    const delaiJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Ignorer les outliers > maxDelaiJours
    if (delaiJours > maxDelaiJours) {
      debugStats.outliers++;
      continue;
    }

    delais.push(delaiJours);
    debugStats.ok++;
  }

  if (debug) {
    console.log('[STATIA_SHARED] delaiPaiementDossier debug:', debugStats);
    console.log('[STATIA_SHARED] delais sample (jours):', delais.slice(0, 10));
  }

  const moyenne = delais.length > 0
    ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
    : null;

  const mediane = calculateMedian(delais);

  return {
    moyenne,
    mediane,
    nbDossiersValides: delais.length,
    min: delais.length > 0 ? Math.min(...delais) : null,
    max: delais.length > 0 ? Math.max(...delais) : null,
    debug: debugStats
  };
}
