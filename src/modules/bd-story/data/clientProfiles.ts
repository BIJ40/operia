/**
 * BD Story — 36 profils clients structurés
 * Chaque profil porte category, tone, householdType ET homeStyle
 * pour maximiser la diversité perçue des histoires
 */

import { ClientProfile } from '../types/bdStory.types';

export const CLIENT_PROFILES: ClientProfile[] = [
  // PARTICULIERS
  { slug: 'solo_calme', label: 'Personne seule calme', category: 'particulier', tone: 'calme', householdType: 'personne_seule', homeStyle: 'moderne' },
  { slug: 'solo_presse', label: 'Personne seule pressée', category: 'particulier', tone: 'presse', householdType: 'personne_seule', homeStyle: 'classique' },
  { slug: 'solo_inquiet', label: 'Personne seule inquiète', category: 'particulier', tone: 'inquiet', householdType: 'personne_seule', homeStyle: 'ancien' },
  { slug: 'couple_serein', label: 'Couple serein', category: 'particulier', tone: 'calme', householdType: 'couple', homeStyle: 'moderne' },
  { slug: 'couple_inquiet', label: 'Couple inquiet', category: 'particulier', tone: 'inquiet', householdType: 'couple', homeStyle: 'classique' },
  { slug: 'couple_exigeant', label: 'Couple exigeant', category: 'particulier', tone: 'exigeant', householdType: 'couple', homeStyle: 'renove' },
  { slug: 'famille_active', label: 'Famille active', category: 'particulier', tone: 'presse', householdType: 'famille', homeStyle: 'moderne' },
  { slug: 'famille_nombreuse', label: 'Famille nombreuse débordée', category: 'particulier', tone: 'presse', householdType: 'famille', homeStyle: 'classique' },
  { slug: 'famille_enfants', label: 'Famille avec jeunes enfants', category: 'particulier', tone: 'inquiet', householdType: 'famille', homeStyle: 'moderne' },
  { slug: 'senior_autonome', label: 'Senior autonome', category: 'particulier', tone: 'calme', householdType: 'senior', homeStyle: 'ancien' },
  { slug: 'senior_inquiet', label: 'Senior inquiet', category: 'particulier', tone: 'inquiet', householdType: 'senior', homeStyle: 'classique' },
  { slug: 'jeune_proprietaire', label: 'Jeune propriétaire', category: 'particulier', tone: 'calme', householdType: 'personne_seule', homeStyle: 'renove' },
  { slug: 'locataire_prudent', label: 'Locataire prudent', category: 'particulier', tone: 'calme', householdType: 'personne_seule', homeStyle: 'ancien' },
  { slug: 'locataire_stresse', label: 'Locataire stressé', category: 'particulier', tone: 'inquiet', householdType: 'personne_seule', homeStyle: 'ancien' },
  { slug: 'proprietaire_exigeant', label: 'Propriétaire exigeant', category: 'particulier', tone: 'exigeant', householdType: 'couple', homeStyle: 'moderne' },
  { slug: 'residence_secondaire', label: 'Propriétaire résidence secondaire', category: 'particulier', tone: 'calme', householdType: 'couple', homeStyle: 'classique' },

  // PRO / MIX
  { slug: 'commercant_presse', label: 'Commerçant pressé', category: 'pro', tone: 'presse', householdType: 'commercant', homeStyle: 'moderne' },
  { slug: 'commercant_image', label: 'Commerçant image prioritaire', category: 'pro', tone: 'exigeant', householdType: 'commercant', homeStyle: 'renove' },
  { slug: 'artisan_local', label: 'Artisan local', category: 'pro', tone: 'calme', householdType: 'commercant', homeStyle: 'ancien' },
  { slug: 'bureau_professionnel', label: 'Bureau professionnel', category: 'pro', tone: 'presse', householdType: 'commercant', homeStyle: 'moderne' },
  { slug: 'gestionnaire_locatif', label: 'Gestionnaire locatif', category: 'pro', tone: 'calme', householdType: 'commercant', homeStyle: 'classique' },
  { slug: 'syndic_copro', label: 'Syndic de copropriété', category: 'pro', tone: 'presse', householdType: 'commercant', homeStyle: 'ancien' },

  // NARRATIFS
  { slug: 'bricoleur_rate', label: 'Bricoleur ayant aggravé', category: 'narratif', tone: 'frustre', homeStyle: 'classique' },
  { slug: 'probleme_ignore', label: 'Problème ignoré trop longtemps', category: 'narratif', tone: 'inquiet', homeStyle: 'ancien' },
  { slug: 'urgence_immediate', label: 'Client en urgence', category: 'narratif', tone: 'presse', homeStyle: 'moderne' },
  { slug: 'client_rassure', label: 'Client déjà confiant', category: 'narratif', tone: 'rassure', homeStyle: 'renove' },
  { slug: 'client_sceptique', label: 'Client sceptique', category: 'narratif', tone: 'sceptique', homeStyle: 'ancien' },
  { slug: 'client_detail', label: 'Client qui veut comprendre', category: 'narratif', tone: 'calme', homeStyle: 'moderne' },
  { slug: 'client_budget', label: 'Client sensible au budget', category: 'narratif', tone: 'inquiet', homeStyle: 'ancien' },
  { slug: 'client_esthetique', label: 'Client sensible au rendu', category: 'narratif', tone: 'exigeant', homeStyle: 'renove' },

  // CONTEXTUELS
  { slug: 'avant_invites', label: 'Client avant réception', category: 'contextuel', tone: 'presse', homeStyle: 'moderne' },
  { slug: 'retour_vacances', label: 'Retour de vacances', category: 'contextuel', tone: 'inquiet', homeStyle: 'classique' },
  { slug: 'matin_presse', label: 'Matin pressé', category: 'contextuel', tone: 'presse', homeStyle: 'moderne' },
  { slug: 'soir_fatigue', label: 'Soir fatigué', category: 'contextuel', tone: 'calme', homeStyle: 'classique' },
  { slug: 'weekend_bricolage', label: 'Week-end bricolage', category: 'contextuel', tone: 'frustre', homeStyle: 'ancien' },
  { slug: 'jour_pluie', label: 'Jour de pluie', category: 'contextuel', tone: 'calme', homeStyle: 'ancien' },
];
