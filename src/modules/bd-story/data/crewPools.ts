/**
 * BD Story — Crew Pools par univers métier
 * Source de vérité pour la sélection technicien compatible
 */

import { CrewPools } from '../types/bdStory.types';

export const CREW_POOLS: CrewPools = {
  plomberie: ['yoann', 'loic', 'maxime'],
  electricite: ['yoann'],
  vitrerie: ['loic', 'pierre_antoine', 'benjamin', 'maxime'],
  serrurerie: ['pierre_antoine', 'benjamin'],
  menuiserie: ['pierre_antoine', 'benjamin'],
  peinture: ['yannick', 'guillaume', 'cris'],
  sols_tapisserie: ['pierre_antoine', 'benjamin'],
  polyvalent: ['maxime'],
};

/** Get compatible technician slugs for a universe */
export function getCrewForUniverse(universe: string): string[] {
  return CREW_POOLS[universe as keyof CrewPools] ?? ['maxime'];
}
