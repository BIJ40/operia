/**
 * StatIA V1 - Normalizers
 * Normalisation centralisée des données Apogée selon STATIA_RULES
 */

/**
 * Normalise un slug d'univers selon les règles STATIA
 */
export function normalizeUniversSlug(slug: string | null | undefined): string {
  if (!slug) return 'non-classe';
  
  const normalized = slug.toLowerCase().trim();
  
  // Mapping COMPLET des variations courantes (aligné sur enrichmentService.ts)
  const mappings: Record<string, string> = {
    // PMR / Amélioration logement
    'amelioration_logement': 'pmr',
    'amelioration-logement': 'pmr',
    'ame_logement': 'pmr',
    'pmr_amenagement': 'pmr',
    'accessibilite': 'pmr',
    'pmr': 'pmr',
    
    // Volets roulants
    'volets': 'volet_roulant',
    'volet': 'volet_roulant',
    'volets_roulants': 'volet_roulant',
    'volet_roulant': 'volet_roulant',
    'store': 'volet_roulant',
    'stores': 'volet_roulant',
    
    // Électricité
    'elec': 'electricite',
    'électricité': 'electricite',
    'electrique': 'electricite',
    'electricite': 'electricite',
    
    // Plomberie
    'plomb': 'plomberie',
    'plomberie': 'plomberie',
    'sanitaire': 'plomberie',
    'sanitaires': 'plomberie',
    
    // Serrurerie
    'serrure': 'serrurerie',
    'serrurier': 'serrurerie',
    'serrurerie': 'serrurerie',
    'serr': 'serrurerie',
    
    // Vitrerie
    'vitre': 'vitrerie',
    'vitres': 'vitrerie',
    'vitrier': 'vitrerie',
    'miroiterie': 'vitrerie',
    'vitrerie': 'vitrerie',
    'vitr': 'vitrerie',
    
    // Menuiserie
    'menuisier': 'menuiserie',
    'bois': 'menuiserie',
    'porte': 'menuiserie',
    'portes': 'menuiserie',
    'fenetre': 'menuiserie',
    'fenetres': 'menuiserie',
    'menuiserie': 'menuiserie',
    
    // Rénovation
    'reno': 'renovation',
    'rénovation': 'renovation',
    'renovation': 'renovation',
    'travaux': 'renovation',
    
    // Multiservices
    'multiservices': 'multiservices',
    'multi': 'multiservices',
    
    // Non classé / fallback
    'non_classe': 'non-classe',
    'non classe': 'non-classe',
    'non-classe': 'non-classe',
    'divers': 'non-classe',
    'inconnu': 'non-classe',
    'autre': 'non-classe',
    '': 'non-classe',
  };
  
  // Si trouvé dans le mapping, retourner la valeur normalisée
  if (mappings[normalized]) {
    return mappings[normalized];
  }
  
  // Sinon, nettoyer et retourner le slug original (pour les nouveaux univers non mappés)
  return normalized.replace(/[^a-z0-9_-]/g, '_') || 'non-classe';
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
 * P2-06: Configuration centralisée des états et types
 * Exportés pour permettre extension/personnalisation
 */

/** Types productifs selon STATIA_RULES */
export const PRODUCTIVE_TYPES: readonly string[] = ['depannage', 'repair', 'travaux', 'work'];

/** Types non-productifs selon STATIA_RULES */
export const NON_PRODUCTIVE_TYPES: readonly string[] = ['rt', 'rdv', 'rdvtech', 'sav', 'diagnostic', 'th'];

/** États d'intervention valides */
export const VALID_INTERVENTION_STATES: readonly string[] = ['validated', 'done', 'finished'];

/** États de facture EXCLUS du CA (brouillons, annulées, pro-forma) */
export const EXCLUDED_FACTURE_STATES: readonly string[] = [
  'draft', 'brouillon', 
  'cancelled', 'canceled', 'annulee', 'annulée', 
  'pro_forma', 'proforma', 'pro-forma'
];

/** États de facture INCLUS dans le CA (validées, payées, envoyées, clôturées) */
export const INCLUDED_FACTURE_STATES: readonly string[] = [
  'sent', 'paid', 'partial', 'partially_paid', 'overdue', 
  'validee', 'validated', 'payee', 
  'cloturee', 'closed', 
  'invoice_sent', 'invoice'
];

/**
 * Vérifie si un type d'intervention est productif selon STATIA_RULES
 */
export function isProductiveInterventionType(type: string): boolean {
  const normalized = normalizeInterventionType(type);
  
  // Cas spécial : "recherche de fuite" est toujours productif
  if (normalized === 'recherche_fuite') return true;
  
  return PRODUCTIVE_TYPES.includes(normalized);
}

/**
 * Vérifie si un type d'intervention est non-productif
 */
export function isNonProductiveInterventionType(type: string): boolean {
  const normalized = normalizeInterventionType(type);
  return NON_PRODUCTIVE_TYPES.includes(normalized);
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
 * Vérifie si une facture doit être incluse dans le CA selon STATIA_RULES
 * Priorité: exclure les états bloquants, puis inclure les états valides
 */
export function isFactureStateIncluded(state: string | undefined): boolean {
  if (!state) return true; // Inclure par défaut si pas d'état (factures legacy)
  
  const stateLower = state.toLowerCase().trim();
  
  // D'abord exclure explicitement les brouillons/annulées/pro-forma
  if (EXCLUDED_FACTURE_STATES.includes(stateLower)) {
    return false;
  }
  
  // Si état vide ou dans la liste incluse → inclure
  if (stateLower === '' || INCLUDED_FACTURE_STATES.includes(stateLower)) {
    return true;
  }
  
  // Par défaut, inclure (factures sans état explicite mais valides)
  return true;
}

/**
 * Vérifie si une intervention est dans un état valide
 */
export function isValidInterventionState(state: string | undefined): boolean {
  if (!state) return false;
  return VALID_INTERVENTION_STATES.includes(state.toLowerCase());
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

// ============================================================================
// P1-01: HELPERS CENTRALISÉS (remplacent duplications dans networkCalculations.ts)
// ============================================================================

/**
 * Parse une date en gérant les formats ISO et FR (DD/MM/YYYY)
 * Centralisé pour éviter duplication
 */
export function parseDateSafe(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  
  try {
    // Format ISO
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) return isoDate;
  } catch {}
  
  try {
    // Format FR DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const frDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(frDate.getTime())) return frDate;
    }
  } catch {}
  
  return null;
}

/** États valides pour une intervention "réalisée" */
export const INTERVENTION_REALIZED_STATES: readonly string[] = [
  'done', 'finished', 'validated', 'completed', 'réalisée', 'terminée'
];

/**
 * Vérifie si une intervention est réalisée selon STATIA_RULES
 * Centralisé pour éviter duplication
 */
export function isInterventionRealisee(intervention: any): boolean {
  const state = (
    intervention.state || 
    intervention.statut || 
    intervention.data?.state || 
    ''
  ).toLowerCase();
  return INTERVENTION_REALIZED_STATES.includes(state);
}

/**
 * Vérifie si une intervention est de type SAV
 * RÈGLE HARMONISÉE: type/type2 CONTIENT "sav" OU picto SAV présent
 * Permet de matcher "SAV", "SAV + Dépannage", "Retour SAV", etc.
 */
export function isSAVIntervention(intervention: any): boolean {
  // Règle 1: Type d'intervention CONTIENT "sav" (pas égalité stricte)
  const type2 = (intervention.data?.type2 || intervention.type2 || '').toLowerCase().trim();
  const type = (intervention.data?.type || intervention.type || '').toLowerCase().trim();
  
  if (type2.includes('sav') || type.includes('sav')) {
    return true;
  }
  
  // Règle 2: Picto SAV présent dans les pictos de l'intervention (égalité stricte pour pictos)
  const pictos = intervention.data?.pictosInterv || intervention.pictosInterv || [];
  if (Array.isArray(pictos)) {
    const hasSAVPicto = pictos.some((picto: any) => {
      const pictoLabel = (typeof picto === 'string' ? picto : picto?.label || picto?.name || '').toLowerCase().trim();
      return pictoLabel === 'sav';
    });
    if (hasSAVPicto) return true;
  }
  
  return false;
}

/** Labels des mois en français (constante centralisée P2-04) */
export const MONTHS_FR: readonly string[] = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
];
