/**
 * BD Story — Types de bien, zones et contextes temporels
 */

import { PropertyType, RoomContext, TimeContext } from '../types/bdStory.types';

export const PROPERTY_TYPES: PropertyType[] = [
  'maison_moderne', 'maison_classique', 'maison_ancienne',
  'appartement_recent', 'appartement_ancien', 'studio',
  'local_commercial', 'petite_copro', 'residence_secondaire',
  'maison_en_renovation',
];

export const ROOM_CONTEXTS: RoomContext[] = [
  'cuisine', 'salle_de_bain', 'salon', 'chambre', 'entree',
  'couloir', 'garage', 'buanderie', 'terrasse', 'balcon',
  'baie_vitree', 'plafond', 'mur', 'sol', 'escalier',
  'facade', 'local_technique', 'vitrine_commerce',
];

export const TIME_CONTEXTS: TimeContext[] = [
  'matin', 'midi', 'apres_midi', 'soir', 'nuit',
  'pluie', 'hiver', 'ete', 'printemps', 'automne',
];
