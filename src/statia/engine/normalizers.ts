/**
 * StatIA V1 - Normalizers
 * Normalisation centralisée des données Apogée selon STATIA_RULES
 */

import { STATIA_RULES } from '../domain/rules';

/**
 * Normalise un slug d'univers selon les règles STATIA
 */
export function normalizeUniversSlug(slug: string | null | undefined): string {
  if (!slug) return 'non-classe';
  
  const normalized = slug.toLowerCase().trim();
  
  // Mapping des variations courantes
  const mappings: Record<string, string> = {
    'plomberie': 'plomberie',
    'plomb': 'plomberie',
    'electricite': 'electricite',
    'elec': 'electricite',
    'électricité': 'electricite',
    'chauffage': 'chauffage',
    'chauf': 'chauffage',
    'climatisation': 'climatisation',
    'clim': 'climatisation',
    'serrurerie': 'serrurerie',
    'serr': 'serrurerie',
    'vitrerie': 'vitrerie',
    'vitr': 'vitrerie',
    'multiservices': 'multiservices',
    'multi': 'multiservices',
    'renovation': 'renovation',
    'reno': 'renovation',
    'non-classe': 'non-classe',
    'non classe': 'non-classe',
    'inconnu': 'non-classe',
    '': 'non-classe',
  };
  
  return mappings[normalized] || normalized;
}

/**
 * Normalise un type d'intervention selon les règles STATIA
 */
export function normalizeInterventionType(type: string | null | undefined): string {
  if (!type) return 'autre';
  
  const normalized = type.toLowerCase().trim();
  
  const mappings: Record<string, string> = {
    'depannage': 'depannage',
    'dépannage': 'depannage',
    'repair': 'depannage',
    'travaux': 'travaux',
    'tvx': 'travaux',
    'work': 'travaux',
    'rt': 'rt',
    'releve technique': 'rt',
    'relevé technique': 'rt',
    'rdv technique': 'rt',
    'th': 'th',
    'sav': 'sav',
    'service apres vente': 'sav',
    'garantie': 'sav',
    'diagnostic': 'diagnostic',
    'recherche de fuite': 'recherche_fuite',
  };
  
  return mappings[normalized] || normalized;
}

/**
 * Vérifie si un type d'intervention est productif selon STATIA_RULES
 */
export function isProductiveInterventionType(type: string): boolean {
  const normalized = normalizeInterventionType(type);
  const productiveTypes = STATIA_RULES.technicians.productiveTypes as readonly string[];
  
  // Cas spécial : "recherche de fuite" est toujours productif
  if (normalized === 'recherche_fuite') return true;
  
  return productiveTypes.includes(normalized);
}

/**
 * Vérifie si un type d'intervention est non-productif
 */
export function isNonProductiveInterventionType(type: string): boolean {
  const normalized = normalizeInterventionType(type);
  const nonProductiveTypes = STATIA_RULES.technicians.nonProductiveTypes as readonly string[];
  
  return nonProductiveTypes.includes(normalized);
}

/**
 * Normalise une date en utilisant dateReelle si disponible
 */
export function normalizeDate(item: any): Date | null {
  // Priorité à dateReelle selon STATIA_RULES
  const dateStr = item.dateReelle || item.date || item.created_at;
  
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extrait le mois/année d'une date pour le groupBy
 */
export function extractMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Normalise le type de facture (avoir vs standard)
 */
export function normalizeFactureType(facture: any): 'standard' | 'avoir' {
  const typeFacture = (facture.typeFacture || facture.type || '').toLowerCase().trim();
  
  if (typeFacture === 'avoir' || typeFacture === 'credit_note' || typeFacture === 'credit') {
    return 'avoir';
  }
  
  return 'standard';
}

/**
 * Calcule le montant net d'une facture selon STATIA_RULES
 * Les avoirs sont traités comme montants négatifs
 */
export function calculateNetAmount(facture: any): number {
  const montant = facture.data?.totalHT ?? facture.totalHT ?? 0;
  const type = normalizeFactureType(facture);
  
  // Selon STATIA_RULES: avoirs = montants négatifs (subtract)
  if (type === 'avoir') {
    return -Math.abs(montant);
  }
  
  return Math.abs(montant);
}

/**
 * Normalise l'identifiant apporteur
 */
export function normalizeApporteurId(project: any): string {
  const apporteurId = project.data?.commanditaireId || project.commanditaireId;
  
  if (!apporteurId) return 'direct';
  
  return String(apporteurId);
}

/**
 * Extrait les univers d'un projet (peut être multiple)
 */
export function extractProjectUniverses(project: any): string[] {
  const universes = project.data?.universes || project.universes || [];
  
  if (Array.isArray(universes) && universes.length > 0) {
    return universes.map(normalizeUniversSlug);
  }
  
  return ['non-classe'];
}

/**
 * Vérifie si une facture est dans les états inclus selon STATIA_RULES
 */
export function isFactureStateIncluded(state: string | undefined): boolean {
  if (!state) return true; // Inclure par défaut si pas d'état
  
  const includedStates = STATIA_RULES.CA.includeStates as readonly string[];
  return includedStates.includes(state.toLowerCase());
}

/**
 * Vérifie si une intervention est dans un état valide
 */
export function isValidInterventionState(state: string | undefined): boolean {
  if (!state) return false;
  
  const validStates = STATIA_RULES.interventions.validStates as readonly string[];
  return validStates.includes(state.toLowerCase());
}

/**
 * Vérifie si un devis est dans un état validé
 */
export function isDevisValidated(devis: any): boolean {
  const state = (devis.state || '').toLowerCase();
  const validatedStates = ['validated', 'signed', 'order', 'accepted'];
  
  // Devis avec facture liée = automatiquement validé
  if (devis.factureId || devis.linkedInvoiceId) {
    return true;
  }
  
  return validatedStates.includes(state);
}
