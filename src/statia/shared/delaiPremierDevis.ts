/**
 * Calcul centralisé du délai premier devis - SOURCE UNIQUE DE VÉRITÉ
 * Utilisé par: StatIA, dashboardCalculations, comparatifAgencesEngine
 */

// Parser une date au format "dd/MM/yyyy HH:mm:ss" (format Apogée)
function parseDateModifApogee(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Format: "09/02/2025 19:15:02"
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

export interface DelaiPremierDevisResult {
  moyenne: number | null;
  nbDossiersAvecDevis: number;
  min: number | null;
  max: number | null;
  debug: {
    total: number;
    horsPeriode: number;
    canceled: number;
    noCreatedAt: number;
    noHistory: number;
    noDevisEnvoye: number;
    invalidDateModif: number;
    negative: number;
    ok: number;
  };
}

export interface DelaiPremierDevisOptions {
  dateStart?: Date;
  dateEnd?: Date;
  maxDelaiJours?: number; // Par défaut 60 jours
  debug?: boolean;
}

/**
 * Calcule le délai moyen entre création dossier et premier devis envoyé
 * Règles:
 * - Utilise project.data.history avec event "=> Devis envoyé" (insensible à la casse du début)
 * - Prend la PREMIÈRE date de devis envoyé si plusieurs
 * - Exclut les délais > maxDelaiJours (outliers)
 * - Exclut les délais négatifs
 */
export function calculateDelaiPremierDevis(
  projects: any[],
  options: DelaiPremierDevisOptions = {}
): DelaiPremierDevisResult {
  const { 
    dateStart, 
    dateEnd, 
    maxDelaiJours = 60,
    debug = false 
  } = options;

  const debugStats = {
    total: projects.length,
    horsPeriode: 0,
    canceled: 0,
    noCreatedAt: 0,
    noHistory: 0,
    noDevisEnvoye: 0,
    invalidDateModif: 0,
    negative: 0,
    ok: 0
  };

  const delais: number[] = [];

  for (const project of projects) {
    // Filtrer par période si spécifiée
    if (dateStart || dateEnd) {
      const projectDate = new Date(project.created_at || project.date);
      if (dateStart && projectDate < dateStart) {
        debugStats.horsPeriode++;
        continue;
      }
      if (dateEnd && projectDate > dateEnd) {
        debugStats.horsPeriode++;
        continue;
      }
    }

    // Exclure les dossiers annulés
    if (project.state === 'canceled' || project.state === 'cancelled') {
      debugStats.canceled++;
      continue;
    }

    // Vérifier created_at
    const createdAtStr = project.created_at;
    if (!createdAtStr) {
      debugStats.noCreatedAt++;
      continue;
    }
    const createdAt = new Date(createdAtStr);
    if (isNaN(createdAt.getTime())) {
      debugStats.noCreatedAt++;
      continue;
    }

    // Vérifier l'historique
    const history = project.data?.history;
    if (!Array.isArray(history) || history.length === 0) {
      debugStats.noHistory++;
      continue;
    }

    // Chercher les événements "=> Devis envoyé" (insensible à la casse du début)
    const devisEnvoyeEntries = history.filter((h: any) => {
      const kind = (h.kind || h.labelKind || '').toLowerCase();
      return kind.endsWith('=> devis envoyé') || kind.includes('devis envoyé');
    });

    if (devisEnvoyeEntries.length === 0) {
      debugStats.noDevisEnvoye++;
      continue;
    }

    // Parser les dateModif et prendre la première chronologiquement
    const parsedDates = devisEnvoyeEntries
      .map((h: any) => parseDateModifApogee(h.dateModif))
      .filter((d: Date | null): d is Date => d !== null);

    if (parsedDates.length === 0) {
      debugStats.invalidDateModif++;
      continue;
    }

    // Trier par date croissante et prendre la PREMIÈRE
    parsedDates.sort((a, b) => a.getTime() - b.getTime());
    const firstDevisDate = parsedDates[0];

    const diffMs = firstDevisDate.getTime() - createdAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Ignorer les délais négatifs ou > maxDelaiJours (outliers)
    if (!Number.isFinite(diffDays) || diffDays < 0 || diffDays > maxDelaiJours) {
      debugStats.negative++;
      continue;
    }

    delais.push(diffDays);
    debugStats.ok++;
  }

  if (debug) {
    console.log('[STATIA_SHARED] delaiPremierDevis debug:', debugStats);
    console.log('[STATIA_SHARED] delais sample (jours):', delais.slice(0, 10).map(d => Math.round(d)));
  }

  const moyenne = delais.length > 0
    ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
    : null;

  return {
    moyenne,
    nbDossiersAvecDevis: delais.length,
    min: delais.length > 0 ? Math.round(Math.min(...delais)) : null,
    max: delais.length > 0 ? Math.round(Math.max(...delais)) : null,
    debug: debugStats
  };
}
