import { Facture } from '@/apogee-connect/types';
import { GlobalFilters } from '@/apogee-connect/contexts/FiltersContext';
import { isWithinInterval, parseISO } from 'date-fns';
import { logApogee } from '@/lib/logger';

/**
 * RECOUVREMENT - DOCUMENTATION
 * 
 * Source de vérité :
 * - Table/API : factures depuis API Apogée
 * - Montant TTC facture : facture.totalTTC
 * - Montant règlements : facture.calc.paidTTC (somme de tous les règlements reçus pour cette facture)
 * 
 * Formule :
 * Recouvrement = Total factures TTC - Total règlements reçus
 * 
 * Interprétation :
 * - Recouvrement > 0 : reste à recouvrer (client doit de l'argent)
 * - Recouvrement = 0 : tout est recouvré
 * - Recouvrement < 0 : trop-perçu (régularisation nécessaire)
 * 
 * Gestion des avoirs :
 * Les avoirs (typeFacture === 'avoir') sont traités comme des factures TTC négatives
 * pour maintenir la cohérence mathématique du recouvrement.
 */

export interface RecouvrementStats {
  /** Total des factures TTC émises (avoirs en négatif) */
  totalFacturesTTC: number;
  /** Total des règlements reçus */
  totalReglementsRecus: number;
  /** Recouvrement = totalFacturesTTC - totalReglementsRecus */
  recouvrement: number;
  /** Nombre de factures analysées */
  nbFactures: number;
  /** Détails pour debug */
  details?: {
    facturesPositives: number;
    avoirs: number;
    facturesPayees: number;
    facturesEnAttente: number;
  };
}

export interface RecouvrementByDimension extends RecouvrementStats {
  /** Identifiant de la dimension (agenceId, apporteurId, clientId, projectId) */
  dimensionId: string;
  /** Libellé de la dimension */
  dimensionLabel: string;
}

/**
 * Calcule le recouvrement global sur un périmètre donné
 * 
 * @param factures - Liste des factures à analyser
 * @param filters - Filtres de période et autres critères
 * @param options - Options de calcul
 * @returns RecouvrementStats
 * 
 * @example
 * ```typescript
 * const stats = calculateRecouvrement(factures, {
 *   dateRange: { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }
 * });
 * console.log(`Recouvrement : ${stats.recouvrement}€`);
 * ```
 */
export function calculateRecouvrement(
  factures: Facture[],
  filters: GlobalFilters,
  options: { includeDetails?: boolean; agencySlug?: string } = {}
): RecouvrementStats {
  // 🔍 DEBUG: Log initial
  logApogee.debug('🔍 calculateRecouvrement - début', {
    nbFacturesTotal: factures?.length || 0,
    dateRange: filters.dateRange,
    sample: factures?.slice(0, 3).map(f => ({
      id: f.id,
      date: f.date,
      totalTTC: f.totalTTC,
      typeFacture: f.typeFacture,
      calc: f.calc,
      paidTTC: f.calc?.paidTTC
    }))
  });

  if (!factures || factures.length === 0) {
    logApogee.warn('❌ calculateRecouvrement - Aucune facture reçue');
    return {
      totalFacturesTTC: 0,
      totalReglementsRecus: 0,
      recouvrement: 0,
      nbFactures: 0,
      details: options.includeDetails ? {
        facturesPositives: 0,
        avoirs: 0,
        facturesPayees: 0,
        facturesEnAttente: 0
      } : undefined
    };
  }

  let totalFacturesTTC = 0;
  let totalReglementsRecus = 0;
  let nbFactures = 0;
  
  // Détails pour debug
  let facturesPositives = 0;
  let avoirs = 0;
  let facturesPayees = 0;
  let facturesEnAttente = 0;

  factures.forEach((facture) => {
    // Filtrage par date
    const dateEmission = facture.date;
    if (!dateEmission) return;

    try {
      const factureDate = parseISO(dateEmission);
      const inRange = isWithinInterval(factureDate, {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });

      if (!inRange) return;

      nbFactures++;

      // 🔍 DEBUG: Log par facture (limité aux 5 premières)
      if (nbFactures <= 5) {
        logApogee.debug(`📄 Facture ${nbFactures}/${factures.length}`, {
          id: facture.id,
          date: dateEmission,
          totalTTC: facture.totalTTC,
          typeFacture: facture.typeFacture,
          calc: facture.calc,
          paidTTC: facture.calc?.paidTTC
        });
      }

      // 1. Calcul du montant TTC de la facture
      const montantTTCRaw = facture.totalTTC || 0;
      const montantTTC = parseFloat(String(montantTTCRaw).replace(/[^0-9.-]/g, ''));

      if (isNaN(montantTTC)) {
        logApogee.warn('Facture avec montant TTC invalide', {
          id: facture.id,
          numeroFacture: facture.numeroFacture,
          totalTTC: facture.totalTTC
        });
        return;
      }

      // Gestion des avoirs : montant négatif
      const typeFacture = (facture.typeFacture || facture.state || '').toLowerCase();
      
      if (typeFacture === 'avoir') {
        const montantAvoir = -Math.abs(montantTTC);
        totalFacturesTTC += montantAvoir;
        avoirs += Math.abs(montantTTC);
      } else {
        totalFacturesTTC += montantTTC;
        facturesPositives += montantTTC;
      }

      // 2. Calcul des règlements reçus
      const paidTTC = facture.calc?.paidTTC || 0;
      const montantReglements = parseFloat(String(paidTTC).replace(/[^0-9.-]/g, '')) || 0;
      
      totalReglementsRecus += montantReglements;

      // Stats détaillées
      if (options.includeDetails) {
        if (montantReglements >= Math.abs(montantTTC)) {
          facturesPayees++;
        } else {
          facturesEnAttente++;
        }
      }

    } catch (error) {
      logApogee.warn('Erreur parsing date facture pour recouvrement', {
        id: facture.id,
        date: dateEmission,
        error
      });
    }
  });

  const recouvrement = totalFacturesTTC - totalReglementsRecus;

  // 🔍 DEBUG: Résultat final
  logApogee.debug('✅ calculateRecouvrement - résultat', {
    nbFactures,
    totalFacturesTTC: totalFacturesTTC.toFixed(2),
    totalReglementsRecus: totalReglementsRecus.toFixed(2),
    recouvrement: recouvrement.toFixed(2),
    details: options.includeDetails ? {
      facturesPositives: facturesPositives.toFixed(2),
      avoirs: avoirs.toFixed(2),
      facturesPayees,
      facturesEnAttente
    } : undefined
  });

  return {
    totalFacturesTTC,
    totalReglementsRecus,
    recouvrement,
    nbFactures,
    details: options.includeDetails ? {
      facturesPositives,
      avoirs,
      facturesPayees,
      facturesEnAttente
    } : undefined
  };
}

/**
 * Calcule le recouvrement par agence
 * 
 * @param factures - Liste des factures
 * @param filters - Filtres globaux
 * @param agencies - Map des agences (id -> label)
 * @returns Tableau de RecouvrementByDimension par agence
 */
export function calculateRecouvrementByAgency(
  factures: Facture[],
  filters: GlobalFilters,
  agencies: Map<string, string>
): RecouvrementByDimension[] {
  // À implémenter si nécessaire selon la structure des données
  // Nécessite un champ "agencyId" sur les factures
  logApogee.warn('calculateRecouvrementByAgency non implémenté - structure agence à clarifier');
  return [];
}

/**
 * Calcule le recouvrement par client
 * 
 * @param factures - Liste des factures
 * @param filters - Filtres globaux
 * @param clients - Map des clients (id -> nom)
 * @returns Tableau de RecouvrementByDimension par client
 */
export function calculateRecouvrementByClient(
  factures: Facture[],
  filters: GlobalFilters,
  clients: Map<string, string>
): RecouvrementByDimension[] {
  const recouvrementByClient = new Map<string, RecouvrementStats & { label: string }>();

  factures.forEach((facture) => {
    const dateEmission = facture.date;
    if (!dateEmission) return;

    try {
      const factureDate = parseISO(dateEmission);
      const inRange = isWithinInterval(factureDate, {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });

      if (!inRange) return;

      const clientId = facture.clientId;
      if (!clientId) return;

      const clientLabel = clients.get(clientId) || `Client ${clientId}`;

      if (!recouvrementByClient.has(clientId)) {
        recouvrementByClient.set(clientId, {
          totalFacturesTTC: 0,
          totalReglementsRecus: 0,
          recouvrement: 0,
          nbFactures: 0,
          label: clientLabel
        });
      }

      const stats = recouvrementByClient.get(clientId)!;

      // Montant TTC
      const montantTTCRaw = facture.totalTTC || 0;
      const montantTTC = parseFloat(String(montantTTCRaw).replace(/[^0-9.-]/g, ''));

      if (!isNaN(montantTTC)) {
        const typeFacture = (facture.typeFacture || '').toLowerCase();
        if (typeFacture === 'avoir') {
          stats.totalFacturesTTC -= Math.abs(montantTTC);
        } else {
          stats.totalFacturesTTC += montantTTC;
        }
      }

      // Règlements
      const paidTTC = facture.calc?.paidTTC || 0;
      const montantReglements = parseFloat(String(paidTTC).replace(/[^0-9.-]/g, '')) || 0;
      stats.totalReglementsRecus += montantReglements;

      stats.nbFactures++;
      stats.recouvrement = stats.totalFacturesTTC - stats.totalReglementsRecus;

    } catch (error) {
      // Ignorer erreurs de parsing
    }
  });

  return Array.from(recouvrementByClient.entries()).map(([clientId, stats]) => ({
    dimensionId: clientId,
    dimensionLabel: stats.label,
    totalFacturesTTC: stats.totalFacturesTTC,
    totalReglementsRecus: stats.totalReglementsRecus,
    recouvrement: stats.recouvrement,
    nbFactures: stats.nbFactures
  }));
}

/**
 * Calcule le recouvrement par projet
 * 
 * @param factures - Liste des factures
 * @param filters - Filtres globaux
 * @param projects - Map des projets (id -> nom)
 * @returns Tableau de RecouvrementByDimension par projet
 */
export function calculateRecouvrementByProject(
  factures: Facture[],
  filters: GlobalFilters,
  projects: Map<string, string>
): RecouvrementByDimension[] {
  const recouvrementByProject = new Map<string, RecouvrementStats & { label: string }>();

  factures.forEach((facture) => {
    const dateEmission = facture.date;
    if (!dateEmission) return;

    try {
      const factureDate = parseISO(dateEmission);
      const inRange = isWithinInterval(factureDate, {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });

      if (!inRange) return;

      const projectId = facture.projectId;
      if (!projectId) return;

      const projectLabel = projects.get(projectId) || `Projet ${projectId}`;

      if (!recouvrementByProject.has(projectId)) {
        recouvrementByProject.set(projectId, {
          totalFacturesTTC: 0,
          totalReglementsRecus: 0,
          recouvrement: 0,
          nbFactures: 0,
          label: projectLabel
        });
      }

      const stats = recouvrementByProject.get(projectId)!;

      // Montant TTC
      const montantTTCRaw = facture.totalTTC || 0;
      const montantTTC = parseFloat(String(montantTTCRaw).replace(/[^0-9.-]/g, ''));

      if (!isNaN(montantTTC)) {
        const typeFacture = (facture.typeFacture || '').toLowerCase();
        if (typeFacture === 'avoir') {
          stats.totalFacturesTTC -= Math.abs(montantTTC);
        } else {
          stats.totalFacturesTTC += montantTTC;
        }
      }

      // Règlements
      const paidTTC = facture.calc?.paidTTC || 0;
      const montantReglements = parseFloat(String(paidTTC).replace(/[^0-9.-]/g, '')) || 0;
      stats.totalReglementsRecus += montantReglements;

      stats.nbFactures++;
      stats.recouvrement = stats.totalFacturesTTC - stats.totalReglementsRecus;

    } catch (error) {
      // Ignorer erreurs de parsing
    }
  });

  return Array.from(recouvrementByProject.entries()).map(([projectId, stats]) => ({
    dimensionId: projectId,
    dimensionLabel: stats.label,
    totalFacturesTTC: stats.totalFacturesTTC,
    totalReglementsRecus: stats.totalReglementsRecus,
    recouvrement: stats.recouvrement,
    nbFactures: stats.nbFactures
  }));
}
