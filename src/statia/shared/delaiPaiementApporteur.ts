/**
 * Calcul centralisé du délai de paiement PAR APPORTEUR - SOURCE UNIQUE DE VÉRITÉ
 * Mesure le temps entre facturation et clôture du dossier, groupé par apporteur
 * Utilisé par: StatIA apporteurs_delai_paiement_moyen, Stats Hub, Veille Apporteurs
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

export interface ApporteurDelaiStats {
  apporteurId: number;
  apporteurName: string;
  nbDossiers: number;
  delaiMoyen: number | null;
  delaiMedian: number | null;
  delaiMin: number | null;
  delaiMax: number | null;
}

export interface DelaiPaiementApporteurResult {
  moyenneGlobale: number | null;
  medianeGlobale: number | null;
  nbDossiersTotal: number;
  nbApporteurs: number;
  parApporteur: ApporteurDelaiStats[];
  debug: {
    totalProjects: number;
    sansApporteur: number;
    sansDateFacturation: number;
    sansDateClos: number;
    delaisNegatifs: number;
    outliers: number;
    ok: number;
  };
}

export interface DelaiPaiementApporteurOptions {
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
    const date = new Date(project.dateStateFacture);
    return isNaN(date.getTime()) ? null : date;
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
 * Calcule le délai de paiement par apporteur (facturation → clôture dossier)
 * Règles:
 * - Uniquement dossiers avec commanditaireId (apporteur)
 * - Date facturation: dateStateFacture sinon premier event "=> Facturé"
 * - Date clôture: dernier event "=> Clos"
 * - Exclut les délais > maxDelaiJours (outliers)
 * - Exclut les délais négatifs
 * - Filtre par période basé sur la date de facturation
 */
export function calculateDelaiPaiementApporteur(
  projects: any[],
  clients: any[],
  options: DelaiPaiementApporteurOptions = {}
): DelaiPaiementApporteurResult {
  const { 
    dateStart, 
    dateEnd, 
    maxDelaiJours = 365,
    debug = false 
  } = options;

  const debugStats = {
    totalProjects: projects.length,
    sansApporteur: 0,
    sansDateFacturation: 0,
    sansDateClos: 0,
    delaisNegatifs: 0,
    outliers: 0,
    ok: 0
  };

  // Indexer les clients par ID pour récupérer le nom
  const clientsById = new Map<number, any>();
  for (const client of clients) {
    const id = client.id || client.clientId;
    if (id) {
      clientsById.set(Number(id), client);
    }
  }

  // Grouper les délais par apporteur
  const delaisParApporteur = new Map<number, number[]>();
  const allDelais: number[] = [];

  for (const project of projects) {
    // Exclure les dossiers annulés
    const state = String(project.state || '').toLowerCase();
    if (state === 'canceled' || state === 'cancelled') {
      continue;
    }

    // Vérifier la présence d'un apporteur (commanditaireId)
    const apporteurId = project.data?.commanditaireId || project.commanditaireId;
    if (!apporteurId) {
      debugStats.sansApporteur++;
      continue;
    }

    // Récupérer la date de facturation
    const dateFacture = getFacturationDate(project);
    if (!dateFacture) {
      debugStats.sansDateFacturation++;
      continue;
    }

    // Filtrer par période (basé sur date de facturation)
    if (dateStart && dateFacture < dateStart) {
      continue;
    }
    if (dateEnd && dateFacture > dateEnd) {
      continue;
    }

    // Récupérer la date de clôture
    const dateClos = getClosDate(project);
    if (!dateClos) {
      debugStats.sansDateClos++;
      continue;
    }

    // Calculer le délai
    const diffMs = dateClos.getTime() - dateFacture.getTime();
    
    // Ignorer les délais négatifs
    if (diffMs < 0) {
      debugStats.delaisNegatifs++;
      continue;
    }
    
    const delaiJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Ignorer les outliers > maxDelaiJours
    if (delaiJours > maxDelaiJours) {
      debugStats.outliers++;
      continue;
    }

    // Ajouter au groupe de l'apporteur
    const apporteurIdNum = Number(apporteurId);
    if (!delaisParApporteur.has(apporteurIdNum)) {
      delaisParApporteur.set(apporteurIdNum, []);
    }
    delaisParApporteur.get(apporteurIdNum)!.push(delaiJours);
    allDelais.push(delaiJours);
    debugStats.ok++;
  }

  if (debug) {
    console.log('[STATIA_SHARED] delaiPaiementApporteur debug:', debugStats);
  }

  // Calculer les stats par apporteur
  const parApporteur: ApporteurDelaiStats[] = [];

  for (const [apporteurId, delais] of delaisParApporteur.entries()) {
    if (delais.length === 0) continue;

    const sortedDelais = [...delais].sort((a, b) => a - b);
    const sum = delais.reduce((acc, v) => acc + v, 0);
    const moyenne = Math.round(sum / delais.length);
    const mediane = calculateMedian(delais);

    // Récupérer le nom de l'apporteur
    const client = clientsById.get(apporteurId);
    const apporteurName = client?.displayName 
      || client?.raisonSociale 
      || client?.nom 
      || client?.name 
      || `Apporteur #${apporteurId}`;

    parApporteur.push({
      apporteurId,
      apporteurName,
      nbDossiers: delais.length,
      delaiMoyen: moyenne,
      delaiMedian: mediane,
      delaiMin: sortedDelais[0],
      delaiMax: sortedDelais[sortedDelais.length - 1],
    });
  }

  // Trier par délai moyen décroissant (les plus lents en premier)
  parApporteur.sort((a, b) => (b.delaiMoyen ?? 0) - (a.delaiMoyen ?? 0));

  // Calculer les stats globales
  const moyenneGlobale = allDelais.length > 0
    ? Math.round(allDelais.reduce((a, b) => a + b, 0) / allDelais.length)
    : null;

  const medianeGlobale = calculateMedian(allDelais);

  return {
    moyenneGlobale,
    medianeGlobale,
    nbDossiersTotal: allDelais.length,
    nbApporteurs: parApporteur.length,
    parApporteur,
    debug: debugStats
  };
}
