/**
 * BD Story — 36 profils clients structurés
 */

import { ClientProfile } from '../types/bdStory.types';

export const CLIENT_PROFILES: ClientProfile[] = [
  // PARTICULIERS
  { slug: 'solo_calme', label: 'Personne seule calme', category: 'particulier', tone: 'calme', householdType: 'personne_seule' },
  { slug: 'solo_presse', label: 'Personne seule pressée', category: 'particulier', tone: 'presse', householdType: 'personne_seule' },
  { slug: 'solo_inquiet', label: 'Personne seule inquiète', category: 'particulier', tone: 'inquiet', householdType: 'personne_seule' },
  { slug: 'couple_serein', label: 'Couple serein', category: 'particulier', tone: 'calme', householdType: 'couple' },
  { slug: 'couple_inquiet', label: 'Couple inquiet', category: 'particulier', tone: 'inquiet', householdType: 'couple' },
  { slug: 'couple_exigeant', label: 'Couple exigeant', category: 'particulier', tone: 'exigeant', householdType: 'couple' },
  { slug: 'famille_active', label: 'Famille active', category: 'particulier', tone: 'presse', householdType: 'famille' },
  { slug: 'famille_nombreuse', label: 'Famille nombreuse débordée', category: 'particulier', tone: 'presse', householdType: 'famille' },
  { slug: 'famille_enfants', label: 'Famille avec jeunes enfants', category: 'particulier', tone: 'inquiet', householdType: 'famille' },
  { slug: 'senior_autonome', label: 'Senior autonome', category: 'particulier', tone: 'calme', householdType: 'senior' },
  { slug: 'senior_inquiet', label: 'Senior inquiet', category: 'particulier', tone: 'inquiet', householdType: 'senior' },
  { slug: 'jeune_proprietaire', label: 'Jeune propriétaire', category: 'particulier', tone: 'calme', householdType: 'personne_seule' },
  { slug: 'locataire_prudent', label: 'Locataire prudent', category: 'particulier', tone: 'calme', householdType: 'personne_seule' },
  { slug: 'locataire_stresse', label: 'Locataire stressé', category: 'particulier', tone: 'inquiet', householdType: 'personne_seule' },
  { slug: 'proprietaire_exigeant', label: 'Propriétaire exigeant', category: 'particulier', tone: 'exigeant', householdType: 'couple' },
  { slug: 'residence_secondaire', label: 'Propriétaire résidence secondaire', category: 'particulier', tone: 'calme', householdType: 'couple' },

  // PRO / MIX
  { slug: 'commercant_presse', label: 'Commerçant pressé', category: 'pro', tone: 'presse', householdType: 'commercant' },
  { slug: 'commercant_image', label: 'Commerçant image prioritaire', category: 'pro', tone: 'exigeant', householdType: 'commercant' },
  { slug: 'artisan_local', label: 'Artisan local', category: 'pro', tone: 'calme', householdType: 'commercant' },
  { slug: 'bureau_professionnel', label: 'Bureau professionnel', category: 'pro', tone: 'presse', householdType: 'commercant' },
  { slug: 'gestionnaire_locatif', label: 'Gestionnaire locatif', category: 'pro', tone: 'calme', householdType: 'commercant' },
  { slug: 'syndic_copro', label: 'Syndic de copropriété', category: 'pro', tone: 'presse', householdType: 'commercant' },

  // NARRATIFS
  { slug: 'bricoleur_rate', label: 'Bricoleur ayant aggravé', category: 'narratif', tone: 'frustre' },
  { slug: 'probleme_ignore', label: 'Problème ignoré trop longtemps', category: 'narratif', tone: 'inquiet' },
  { slug: 'urgence_immediate', label: 'Client en urgence', category: 'narratif', tone: 'presse' },
  { slug: 'client_rassure', label: 'Client déjà confiant', category: 'narratif', tone: 'rassure' },
  { slug: 'client_sceptique', label: 'Client sceptique', category: 'narratif', tone: 'sceptique' },
  { slug: 'client_detail', label: 'Client qui veut comprendre', category: 'narratif', tone: 'calme' },
  { slug: 'client_budget', label: 'Client sensible au budget', category: 'narratif', tone: 'inquiet' },
  { slug: 'client_esthetique', label: 'Client sensible au rendu', category: 'narratif', tone: 'exigeant' },

  // CONTEXTUELS
  { slug: 'avant_invites', label: 'Client avant réception', category: 'contextuel', tone: 'presse' },
  { slug: 'retour_vacances', label: 'Retour de vacances', category: 'contextuel', tone: 'inquiet' },
  { slug: 'matin_presse', label: 'Matin pressé', category: 'contextuel', tone: 'presse' },
  { slug: 'soir_fatigue', label: 'Soir fatigué', category: 'contextuel', tone: 'calme' },
  { slug: 'weekend_bricolage', label: 'Week-end bricolage', category: 'contextuel', tone: 'frustre' },
  { slug: 'jour_pluie', label: 'Jour de pluie', category: 'contextuel', tone: 'calme' },
];
