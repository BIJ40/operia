/**
 * Hook pour calculer la complétude d'un profil RH
 * Retourne un score pondéré et les champs manquants
 */

import { useMemo } from 'react';
import { RHCollaborator } from '@/types/rh-suivi';

export interface ProfileCompletenessResult {
  /** Score de 0 à 100 */
  percent: number;
  /** Liste des champs manquants */
  missing: string[];
  /** Statut global */
  status: 'complete' | 'partial' | 'minimal';
  /** Détail par catégorie */
  categories: {
    id: string;
    label: string;
    percent: number;
    missing: string[];
  }[];
}

// Définition des critères de complétude avec leurs poids
const COMPLETENESS_CRITERIA = {
  baseInfo: {
    label: 'Infos de base',
    weight: 0.20,
    fields: [
      { key: 'first_name', label: 'Prénom', check: (c: RHCollaborator) => !!c.first_name },
      { key: 'last_name', label: 'Nom', check: (c: RHCollaborator) => !!c.last_name },
      { key: 'email', label: 'Email', check: (c: RHCollaborator) => !!c.email },
      { key: 'phone', label: 'Téléphone', check: (c: RHCollaborator) => !!c.phone },
    ],
  },
  personalInfo: {
    label: 'Infos personnelles',
    weight: 0.15,
    fields: [
      { key: 'street', label: 'Adresse', check: (c: RHCollaborator) => !!c.street },
      { key: 'postal_code', label: 'Code postal', check: (c: RHCollaborator) => !!c.postal_code },
      { key: 'city', label: 'Ville', check: (c: RHCollaborator) => !!c.city },
      { key: 'birth_date', label: 'Date de naissance', check: (c: RHCollaborator) => !!c.sensitive_data?.birth_date_encrypted },
    ],
  },
  security: {
    label: 'Sécurité & EPI',
    weight: 0.20,
    fields: [
      { key: 'taille_haut', label: 'Taille haut', check: (c: RHCollaborator) => !!c.epi_profile?.taille_haut },
      { key: 'taille_bas', label: 'Taille bas', check: (c: RHCollaborator) => !!c.epi_profile?.taille_bas },
      { key: 'pointure', label: 'Pointure', check: (c: RHCollaborator) => !!c.epi_profile?.pointure },
      { key: 'epi_remis', label: 'EPI remis', check: (c: RHCollaborator) => (c.epi_profile?.epi_remis?.length || 0) > 0 },
    ],
  },
  competencies: {
    label: 'Compétences',
    weight: 0.20,
    fields: [
      { key: 'competences', label: 'Compétences techniques', check: (c: RHCollaborator) => (c.competencies?.competences_techniques?.length || 0) > 0 },
      { key: 'habilitation', label: 'Habilitation électrique', check: (c: RHCollaborator) => !!c.competencies?.habilitation_electrique_statut },
    ],
  },
  documents: {
    label: 'Documents',
    weight: 0.15,
    fields: [
      { key: 'permis', label: 'Permis', check: (c: RHCollaborator) => !!c.permis },
      { key: 'cni', label: 'CNI', check: (c: RHCollaborator) => !!c.cni },
    ],
  },
  fleet: {
    label: 'Parc & Matériel',
    weight: 0.10,
    fields: [
      { key: 'vehicule', label: 'Véhicule', check: (c: RHCollaborator) => !!c.assets?.vehicule_attribue },
      { key: 'telephone', label: 'Téléphone/Tablette', check: (c: RHCollaborator) => !!c.assets?.tablette_telephone },
    ],
  },
};

export function useProfileCompleteness(collaborator: RHCollaborator | undefined): ProfileCompletenessResult {
  return useMemo(() => {
    if (!collaborator) {
      return {
        percent: 0,
        missing: [],
        status: 'minimal' as const,
        categories: [],
      };
    }

    const categories: ProfileCompletenessResult['categories'] = [];
    let totalWeightedScore = 0;
    const allMissing: string[] = [];

    // Calculer pour chaque catégorie
    Object.entries(COMPLETENESS_CRITERIA).forEach(([catId, category]) => {
      const catMissing: string[] = [];
      let catFilled = 0;

      category.fields.forEach((field) => {
        if (field.check(collaborator)) {
          catFilled++;
        } else {
          catMissing.push(field.label);
          allMissing.push(field.label);
        }
      });

      const catPercent = category.fields.length > 0
        ? Math.round((catFilled / category.fields.length) * 100)
        : 100;

      categories.push({
        id: catId,
        label: category.label,
        percent: catPercent,
        missing: catMissing,
      });

      // Score pondéré
      totalWeightedScore += (catFilled / category.fields.length) * category.weight;
    });

    const percent = Math.round(totalWeightedScore * 100);

    // Déterminer le statut
    let status: ProfileCompletenessResult['status'] = 'minimal';
    if (percent >= 90) {
      status = 'complete';
    } else if (percent >= 50) {
      status = 'partial';
    }

    return {
      percent,
      missing: allMissing,
      status,
      categories,
    };
  }, [collaborator]);
}

// Fonction utilitaire pour obtenir la couleur du statut
export function getCompletenessColor(percent: number): {
  bg: string;
  text: string;
  progress: string;
} {
  if (percent >= 90) {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      progress: 'bg-green-500',
    };
  }
  if (percent >= 70) {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      progress: 'bg-blue-500',
    };
  }
  if (percent >= 50) {
    return {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      progress: 'bg-yellow-500',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    progress: 'bg-red-500',
  };
}

// Fonction utilitaire pour obtenir l'icône du statut
export function getCompletenessIcon(status: ProfileCompletenessResult['status']): string {
  switch (status) {
    case 'complete':
      return '✅';
    case 'partial':
      return '🔶';
    case 'minimal':
      return '⚠️';
    default:
      return '❓';
  }
}
