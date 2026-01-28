/**
 * Hook pour calculer les indicateurs du Cockpit RH
 * Retourne un état synthétique pour chaque collaborateur
 * Style LUCCA : lisible en 2 secondes
 */

import { useMemo } from 'react';
import { RHCollaborator } from '@/types/rh-suivi';
import { calculateProfileCompleteness } from './useProfileCompleteness';
import { CollaboratorEpiSummary } from '@/hooks/epi/useCollaboratorsEpiSummary';

// Types d'indicateurs visuels
export type IndicatorStatus = 'ok' | 'warning' | 'error' | 'na';

// Structure des indicateurs cockpit pour un collaborateur
export interface CockpitIndicators {
  /** Contact : email ET téléphone présents */
  contact: IndicatorStatus;
  /** ICE : nombre de contacts d'urgence (0, 1 ou 2) */
  ice: 0 | 1 | 2;
  /** Statut ICE pour affichage couleur */
  iceStatus: IndicatorStatus;
  /** RH : dates hiring renseignées */
  rh: IndicatorStatus;
  /** EPI & Tailles : synthèse équipement */
  epiTailles: IndicatorStatus;
  /** Parc : véhicule attribué */
  parc: 'vehicle' | 'none';
  /** Documents : nombre total de documents */
  documents: { count: number };
  documentsStatus: IndicatorStatus;
  /** Compétences : nombre total */
  competences: number;
  competencesStatus: IndicatorStatus;
  /** Complétude : pourcentage 0-100 */
  completeness: number;
  completenessStatus: IndicatorStatus;
  /** Statut global du profil */
  globalStatus: IndicatorStatus;
}


/**
 * Calcule les indicateurs cockpit pour un collaborateur
 */
export function calculateCockpitIndicators(
  collaborator: RHCollaborator,
  epiSummary?: CollaboratorEpiSummary
): CockpitIndicators {
  // Contact : email ET téléphone
  const hasEmail = !!collaborator.email;
  const hasPhone = !!collaborator.phone;
  const contact: IndicatorStatus = hasEmail && hasPhone ? 'ok' : 'warning';

  // ICE : on ne déchiffre PAS côté client.
  // On se base uniquement sur la présence des champs chiffrés (non-nuls) dans collaborator_sensitive_data.
  const hasIceContact = !!collaborator.sensitive_data?.emergency_contact_encrypted;
  const hasIcePhone = !!collaborator.sensitive_data?.emergency_phone_encrypted;
  const iceCount = ((hasIceContact ? 1 : 0) + (hasIcePhone ? 1 : 0)) as 0 | 1 | 2;
  const iceStatus: IndicatorStatus = iceCount === 2 ? 'ok' : iceCount === 1 ? 'warning' : 'error';

  // RH : hiring_date présent
  const rh: IndicatorStatus = !!collaborator.hiring_date ? 'ok' : 'warning';

  // EPI & Tailles
  let epiTailles: IndicatorStatus = 'na';
  if (collaborator.epi_profile) {
    const hasTailles = !!(
      collaborator.epi_profile.taille_haut ||
      collaborator.epi_profile.taille_bas ||
      collaborator.epi_profile.pointure
    );
    const epiStatus = collaborator.epi_profile.statut_epi;
    
    if (epiStatus === 'OK' && hasTailles) {
      epiTailles = 'ok';
    } else if (epiStatus === 'MISSING' || !hasTailles) {
      epiTailles = 'warning';
    } else if (epiStatus === 'TO_RENEW') {
      epiTailles = 'warning';
    } else {
      epiTailles = 'na';
    }
  } else if (collaborator.type === 'TECHNICIEN') {
    // Technicien sans profil EPI = warning
    epiTailles = 'warning';
  }

  // Parc : véhicule attribué
  const parc: 'vehicle' | 'none' = collaborator.assets?.vehicule_attribue ? 'vehicle' : 'none';

  // Documents : nombre total (permis + CNI + documents uploadés via collaborator_documents)
  let docsCount = 0;
  if (collaborator.permis) docsCount++;
  if (collaborator.cni) docsCount++;
  // Note: les documents uploadés seront comptés via une query séparée si nécessaire
  const documents = { count: docsCount };
  const documentsStatus: IndicatorStatus = 
    docsCount > 0 ? 'ok' : 'na';

  // Compétences : nombre total
  const competencesCount = (collaborator.competencies?.competences_techniques?.length || 0) +
    (collaborator.competencies?.caces?.length || 0) +
    (collaborator.competencies?.habilitation_electrique_statut ? 1 : 0);
  const competencesStatus: IndicatorStatus = 
    competencesCount >= 3 ? 'ok' : 
    competencesCount > 0 ? 'warning' : 'na';

  // Complétude via le hook existant
  const completenessResult = calculateProfileCompleteness(collaborator);
  const completeness = completenessResult.percent;
  const completenessStatus: IndicatorStatus = 
    completeness >= 80 ? 'ok' : 
    completeness >= 50 ? 'warning' : 'error';

  // Statut global : le pire statut parmi les indicateurs clés
  const statuses = [contact, rh, documentsStatus, completenessStatus];
  let globalStatus: IndicatorStatus = 'ok';
  if (statuses.includes('error')) {
    globalStatus = 'error';
  } else if (statuses.includes('warning')) {
    globalStatus = 'warning';
  }

  return {
    contact,
    ice: iceCount,
    iceStatus,
    rh,
    epiTailles,
    parc,
    documents,
    documentsStatus,
    competences: competencesCount,
    competencesStatus,
    completeness,
    completenessStatus,
    globalStatus,
  };
}

/**
 * Hook pour calculer les indicateurs d'un collaborateur
 */
export function useRHCockpitIndicators(
  collaborator: RHCollaborator | undefined,
  epiSummary?: CollaboratorEpiSummary
): CockpitIndicators | null {
  return useMemo(() => {
    if (!collaborator) return null;
    return calculateCockpitIndicators(collaborator, epiSummary);
  }, [collaborator, epiSummary]);
}

/**
 * Hook pour calculer les indicateurs de tous les collaborateurs
 */
export function useRHCockpitIndicatorsBatch(
  collaborators: RHCollaborator[],
  epiSummaries: CollaboratorEpiSummary[] = []
): Map<string, CockpitIndicators> {
  return useMemo(() => {
    const map = new Map<string, CockpitIndicators>();
    for (const collab of collaborators) {
      const epiSummary = epiSummaries.find(s => s.collaborator_id === collab.id);
      map.set(collab.id, calculateCockpitIndicators(collab, epiSummary));
    }
    return map;
  }, [collaborators, epiSummaries]);
}

/**
 * Couleurs LUCCA pour les indicateurs (douces, jamais agressives)
 */
export const INDICATOR_COLORS: Record<IndicatorStatus, { bg: string; text: string; border: string }> = {
  ok: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  error: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  na: {
    bg: 'bg-slate-50 dark:bg-slate-800/30',
    text: 'text-slate-400 dark:text-slate-500',
    border: 'border-slate-200 dark:border-slate-700',
  },
};

/**
 * Icônes pour les statuts
 */
export const INDICATOR_ICONS: Record<IndicatorStatus, string> = {
  ok: '✓',
  warning: '⚠',
  error: '✗',
  na: '—',
};
