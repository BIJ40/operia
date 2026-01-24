/**
 * PHASE 0 - Protection des accès spéciaux
 * 
 * Ce hook vérifie si un utilisateur est dans la whitelist protégée.
 * Les utilisateurs protégés ont un accès garanti, indépendamment du plan/rôle.
 * 
 * Types d'accès protégés:
 * - 'projects': Accès au module apogee_tickets (Kanban, création tickets)
 * - 'support_agent': Accès console support
 * - 'faq_admin': Accès admin FAQ
 */

import { supabase } from '@/integrations/supabase/client';

export type ProtectedAccessType = 'projects' | 'support_agent' | 'faq_admin';

export interface ProtectedAccessRecord {
  user_id: string;
  access_type: ProtectedAccessType;
  is_locked: boolean;
  notes: string | null;
}

/**
 * Vérifie si un utilisateur a un accès protégé pour un type donné.
 * Cette fonction est appelée lors du chargement du contexte auth.
 * 
 * @param userId - UUID de l'utilisateur
 * @param accessType - Type d'accès à vérifier
 * @returns true si l'utilisateur est protégé pour ce type d'accès
 */
export async function checkProtectedAccess(
  userId: string, 
  accessType: ProtectedAccessType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('protected_user_access')
      .select('is_locked')
      .eq('user_id', userId)
      .eq('access_type', accessType)
      .eq('is_locked', true)
      .maybeSingle();
    
    if (error) {
      // Silently fail - don't block access if table doesn't exist or query fails
      console.warn('[ProtectedAccess] Error checking protected access:', error.message);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('[ProtectedAccess] Unexpected error:', err);
    return false;
  }
}

/**
 * Récupère tous les accès protégés d'un utilisateur.
 * Utile pour afficher les badges dans l'UI admin.
 * 
 * @param userId - UUID de l'utilisateur
 * @returns Liste des accès protégés
 */
export async function getProtectedAccessList(
  userId: string
): Promise<ProtectedAccessRecord[]> {
  try {
    const { data, error } = await supabase
      .from('protected_user_access')
      .select('user_id, access_type, is_locked, notes')
      .eq('user_id', userId)
      .eq('is_locked', true);
    
    if (error) {
      console.warn('[ProtectedAccess] Error fetching protected access list:', error.message);
      return [];
    }
    
    return (data || []).map(row => ({
      user_id: row.user_id,
      access_type: row.access_type as ProtectedAccessType,
      is_locked: row.is_locked,
      notes: row.notes,
    }));
  } catch (err) {
    console.error('[ProtectedAccess] Unexpected error:', err);
    return [];
  }
}

/**
 * Liste des UUIDs protégés pour /projects (hardcodé comme filet de sécurité).
 * Même si la table est corrompue, ces utilisateurs gardent leur accès.
 */
export const PROTECTED_PROJECTS_USERS = [
  'e43de17a-ce1d-4238-aeaa-4b57f4b822e2', // Hugo Bulthé - Dynoco
  '46ca0725-c16e-4d95-a8df-42deecbbc61c', // Gregory Gauthier - SEB Connect
  '962cbd88-5d29-45a9-86dc-637ebe76eae5', // Philippe Massari - Core SI
  'acf6013b-e774-4aa0-88c7-bfe44dd82607', // Florian Dhaillecourt - HelpConfort
  '4837965e-11e0-4639-8283-1808292a1c2b', // Eric Baligout - LPS Réseaux
  '9b80c88a-546c-4329-b04a-6977c5e46fad', // Jérôme Ducourneau - Fondateur
] as const;

/**
 * Vérifie si un utilisateur est dans la whitelist hardcodée.
 * Double sécurité en cas de problème avec la table.
 */
export function isHardcodedProtectedUser(userId: string): boolean {
  return PROTECTED_PROJECTS_USERS.includes(userId as any);
}
