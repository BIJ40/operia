/**
 * StatIA - Facture Meta Helper
 * 
 * P0: Module unique pour extraire les métadonnées des factures
 * et uniformiser le traitement CA / avoirs / dates
 * 
 * RÈGLE IMMUABLE: Les avoirs sont TOUJOURS traités comme montants NÉGATIFS
 */

import { FACTURE_TYPES_AVOIR } from '@/statia/domain/rules';
import type { StatParams } from '@/statia/definitions/types';

export interface FactureMeta {
  /** ID de la facture */
  id: string | number;
  /** ID du projet associé */
  projectId: string | number | null;
  /** Montant HT net (négatif si avoir) */
  montantNetHT: number;
  /** Montant HT brut (valeur absolue) */
  montantBrutHT: number;
  /** Est-ce un avoir? */
  isAvoir: boolean;
  /** Type de facture normalisé */
  typeFacture: string;
  /** Date effective pour les calculs (dateReelle prioritaire) */
  dateEffective: Date | null;
  /** État de la facture */
  state: string | null;
  /** Client ID */
  clientId: string | number | null;
}

/**
 * Normalise le type de facture en minuscules
 */
function normalizeTypeFacture(rawType: unknown): string {
  if (!rawType) return 'facture';
  return String(rawType).toLowerCase().trim();
}

/**
 * Vérifie si le type de facture est un avoir
 */
export function isAvoirType(typeFacture: string): boolean {
  const normalized = normalizeTypeFacture(typeFacture);
  return FACTURE_TYPES_AVOIR.map(t => t.toLowerCase()).includes(normalized);
}

/**
 * Parse une date depuis différents formats possibles
 */
function parseFactureDate(dateValue: unknown): Date | null {
  if (!dateValue) return null;
  
  const dateStr = String(dateValue);
  
  // Format ISO
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  // Format DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

/**
 * Extrait le montant HT brut depuis différentes sources possibles
 */
function extractMontantHT(facture: Record<string, any>): number {
  // Priorité 1: data.totalHT (source principale selon STATIA_RULES)
  if (facture.data?.totalHT !== undefined) {
    const val = parseFloat(String(facture.data.totalHT).replace(/[^0-9.-]/g, ''));
    if (!isNaN(val)) return Math.abs(val);
  }
  
  // Priorité 2: totalHT à la racine
  if (facture.totalHT !== undefined) {
    const val = parseFloat(String(facture.totalHT).replace(/[^0-9.-]/g, ''));
    if (!isNaN(val)) return Math.abs(val);
  }
  
  // Priorité 3: montantHT
  if (facture.montantHT !== undefined) {
    const val = parseFloat(String(facture.montantHT).replace(/[^0-9.-]/g, ''));
    if (!isNaN(val)) return Math.abs(val);
  }
  
  // Fallback: 0
  return 0;
}

/**
 * Extrait les métadonnées complètes d'une facture
 * 
 * @param facture - Objet facture brut de l'API Apogée
 * @returns Métadonnées structurées
 */
export function extractFactureMeta(facture: Record<string, any>): FactureMeta {
  const typeFacture = normalizeTypeFacture(facture.typeFacture || facture.type || facture.data?.typeFacture);
  const isAvoir = isAvoirType(typeFacture);
  const montantBrutHT = extractMontantHT(facture);
  
  // RÈGLE CRITIQUE: Les avoirs sont TOUJOURS négatifs
  const montantNetHT = isAvoir ? -Math.abs(montantBrutHT) : montantBrutHT;
  
  // Date effective: dateReelle prioritaire (STATIA_RULES.dates.factures)
  const dateEffective = parseFactureDate(
    facture.dateReelle || facture.data?.dateReelle || facture.dateEmission || facture.date || facture.created_at
  );
  
  return {
    id: facture.id,
    projectId: facture.projectId || facture.project_id || null,
    montantNetHT,
    montantBrutHT,
    isAvoir,
    typeFacture,
    dateEffective,
    state: facture.state || facture.etat || null,
    clientId: facture.clientId || facture.client_id || null,
  };
}

/**
 * Vérifie si une facture doit être incluse dans les calculs StatIA
 * selon les paramètres fournis
 * 
 * @param meta - Métadonnées de la facture
 * @param params - Paramètres de requête StatIA
 * @returns true si la facture doit être incluse
 */
export function isFactureIncludedForStat(meta: FactureMeta, params: StatParams): boolean {
  // Vérifier la période
  if (params.dateRange && meta.dateEffective) {
    const { start, end } = params.dateRange;
    if (meta.dateEffective < start || meta.dateEffective > end) {
      return false;
    }
  }
  
  // Si pas de date effective, exclure (données incomplètes)
  if (!meta.dateEffective) {
    return false;
  }
  
  // Filtre paidOnly (uniquement factures payées)
  if (params.filters?.paidOnly) {
    const paidStates = ['paid', 'payee', 'paye', 'reglee'];
    if (!meta.state || !paidStates.includes(meta.state.toLowerCase())) {
      return false;
    }
  }
  
  // Par défaut, inclure (les avoirs sont inclus avec montant négatif)
  return true;
}

/**
 * Calcule le CA net total pour un ensemble de factures
 * 
 * @param factures - Liste des factures brutes
 * @param params - Paramètres de filtre
 * @returns { caNetHT, factureCount, avoirCount, factureTotal, avoirTotal }
 */
export function calculateCAFromFactures(
  factures: Record<string, any>[],
  params: StatParams
): {
  caNetHT: number;
  factureCount: number;
  avoirCount: number;
  factureTotal: number;
  avoirTotal: number;
} {
  let caNetHT = 0;
  let factureCount = 0;
  let avoirCount = 0;
  let factureTotal = 0;
  let avoirTotal = 0;
  
  for (const facture of factures) {
    const meta = extractFactureMeta(facture);
    
    if (!isFactureIncludedForStat(meta, params)) {
      continue;
    }
    
    caNetHT += meta.montantNetHT;
    
    if (meta.isAvoir) {
      avoirCount++;
      avoirTotal += meta.montantBrutHT;
    } else {
      factureCount++;
      factureTotal += meta.montantBrutHT;
    }
  }
  
  return {
    caNetHT,
    factureCount,
    avoirCount,
    factureTotal,
    avoirTotal,
  };
}

/**
 * Vérifie la cohérence du CA (self-check StatIA)
 * 
 * @param caGlobal - CA global calculé
 * @param caParEntite - Map des CA par entité (univers, apporteur, technicien)
 * @param tolerance - Tolérance en euros (défaut: 1€)
 * @returns { isValid, diff, message }
 */
export function verifyCACohérence(
  caGlobal: number,
  caParEntite: Map<string, number> | Record<string, number>,
  tolerance: number = 1
): { isValid: boolean; diff: number; message: string } {
  const entiteMap = caParEntite instanceof Map 
    ? caParEntite 
    : new Map(Object.entries(caParEntite));
  
  const sumEntite = Array.from(entiteMap.values()).reduce((sum, ca) => sum + ca, 0);
  const diff = sumEntite - caGlobal;
  const isValid = Math.abs(diff) <= tolerance;
  
  const message = isValid
    ? `✅ CA cohérent: global=${caGlobal.toFixed(2)}€, entités=${sumEntite.toFixed(2)}€`
    : `❌ INCOHÉRENCE CA: global=${caGlobal.toFixed(2)}€, entités=${sumEntite.toFixed(2)}€, diff=${diff.toFixed(2)}€`;
  
  return { isValid, diff, message };
}
