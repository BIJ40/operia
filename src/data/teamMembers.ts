/**
 * teamMembers — Registre des collaborateurs HelpConfort pour le Social Hub.
 * Les avatars sont utilisés dans les visuels "brand" / "prospection" / "équipe".
 */

import femme1 from '@/assets/team/team-femme-1.png';
import femme2 from '@/assets/team/team-femme-2.png';
import femme3 from '@/assets/team/team-femme-3.png';
import homme1 from '@/assets/team/team-homme-1.png';
import homme2 from '@/assets/team/team-homme-2.png';
import homme3 from '@/assets/team/team-homme-3.png';
import homme4 from '@/assets/team/team-homme-4.png';
import homme5 from '@/assets/team/team-homme-5.png';
import homme6 from '@/assets/team/team-homme-6.png';
import homme7 from '@/assets/team/team-homme-7.png';
import homme8 from '@/assets/team/team-homme-8.png';
import homme9 from '@/assets/team/team-homme-9.png';

export interface TeamMember {
  slug: string;
  displayName: string;
  role: 'technicien' | 'secretaire' | 'commercial' | 'dirigeant';
  avatar: string;
  universe?: string[];
}

export const TEAM_MEMBERS: TeamMember[] = [
  // Secrétaires / Assistantes
  { slug: 'assistante-1', displayName: 'Assistante', role: 'secretaire', avatar: femme1 },
  { slug: 'assistante-2', displayName: 'Assistante', role: 'secretaire', avatar: femme2 },
  { slug: 'assistante-3', displayName: 'Assistante', role: 'secretaire', avatar: femme3 },
  // Techniciens
  { slug: 'technicien-1', displayName: 'Technicien', role: 'technicien', avatar: homme1, universe: ['plomberie', 'serrurerie'] },
  { slug: 'technicien-2', displayName: 'Technicien', role: 'technicien', avatar: homme2, universe: ['electricite', 'volets'] },
  { slug: 'technicien-3', displayName: 'Technicien', role: 'technicien', avatar: homme3, universe: ['menuiserie', 'renovation'] },
  { slug: 'technicien-4', displayName: 'Technicien', role: 'technicien', avatar: homme4, universe: ['plomberie', 'vitrerie'] },
  { slug: 'technicien-5', displayName: 'Technicien', role: 'technicien', avatar: homme5, universe: ['serrurerie', 'menuiserie'] },
  { slug: 'technicien-6', displayName: 'Technicien', role: 'technicien', avatar: homme6, universe: ['electricite', 'pmr'] },
  { slug: 'technicien-7', displayName: 'Technicien', role: 'technicien', avatar: homme7, universe: ['vitrerie', 'volets'] },
  { slug: 'technicien-8', displayName: 'Technicien', role: 'technicien', avatar: homme8, universe: ['renovation', 'plomberie'] },
  // Dirigeant
  { slug: 'dirigeant-1', displayName: 'Directeur', role: 'dirigeant', avatar: homme9 },
];

/** Returns team members relevant for a given universe, or all if no universe specified */
export function getTeamForUniverse(universe?: string | null): TeamMember[] {
  if (!universe) return TEAM_MEMBERS;
  const techs = TEAM_MEMBERS.filter(
    m => m.role === 'technicien' && m.universe?.includes(universe)
  );
  const others = TEAM_MEMBERS.filter(m => m.role !== 'technicien');
  return [...others, ...techs];
}

/** Returns a random subset of team members for display (max count) */
export function getTeamSubset(count: number, universe?: string | null): TeamMember[] {
  const pool = getTeamForUniverse(universe);
  if (pool.length <= count) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
