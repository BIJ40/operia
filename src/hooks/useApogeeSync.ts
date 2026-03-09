/**
 * Hook de synchronisation Apogée → Collaborateurs
 * Compare les utilisateurs Apogée avec les collaborateurs existants
 * et génère les actions de sync (créer, mettre à jour, marquer comme parti, lier)
 * 
 * Anti-doublon: détecte les collaborateurs existants par nom/email même sans apogee_user_id
 */

import { useMemo } from 'react';
import { logError } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApogeeUsers } from '@/shared/api/apogee/useApogeeUsers';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';
import type { RHCollaborator } from '@/types/rh-suivi';
import type { ApogeeUserFull, ApogeeUserData } from '@/shared/types/apogeeUser';
import { mapApogeeTypeToCollaboratorType } from '@/shared/types/apogeeUser';

export interface SyncAction {
  type: 'create' | 'update' | 'mark_departed' | 'link';
  apogeeUser: ApogeeUserFull;
  existingCollaborator?: RHCollaborator;
  changes?: string[];
}

interface UseApogeeSyncOptions {
  agencySlug?: string;
  collaborators: RHCollaborator[];
}

/** Normalize string for fuzzy matching */
function norm(s: string | null | undefined): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function useApogeeSync({ agencySlug, collaborators }: UseApogeeSyncOptions) {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  
  // Récupérer les utilisateurs Apogée
  const { users: apogeeUsers, loading: loadingUsers, refetch } = useApogeeUsers({ agencySlug });
  
  // Calculer les actions de synchronisation
  const syncActions = useMemo(() => {
    if (!apogeeUsers.length) return [];
    
    const actions: SyncAction[] = [];
    
    // Index des collaborateurs par apogee_user_id
    const collaboratorsByApogeeId = new Map<number, RHCollaborator>();
    collaborators.forEach(c => {
      if (c.apogee_user_id) {
        collaboratorsByApogeeId.set(c.apogee_user_id, c);
      }
    });
    
    // Index des collaborateurs SANS apogee_user_id par nom normalisé et par email
    const collabsByName = new Map<string, RHCollaborator[]>();
    const collabsByEmail = new Map<string, RHCollaborator>();
    collaborators.forEach(c => {
      if (!c.apogee_user_id) {
        // Index par nom
        const key = `${norm(c.first_name)}|${norm(c.last_name)}`;
        if (!collabsByName.has(key)) collabsByName.set(key, []);
        collabsByName.get(key)!.push(c);
        // Index par email
        if (c.email) {
          collabsByEmail.set(norm(c.email), c);
        }
      }
    });
    
    // Track already matched collaborators to avoid double-matching
    const matchedCollabIds = new Set<string>();
    
    // Filtrer les utilisateurs système avant le traitement
    const validApogeeUsers = (apogeeUsers as ApogeeUserFull[]).filter(user => {
      if (user.firstname?.toLowerCase() === 'dynoco') return false;
      if (user.id === 1) return false;
      return true;
    });
    
    for (const apogeeUser of validApogeeUsers) {
      const existing = collaboratorsByApogeeId.get(apogeeUser.id);
      
      if (existing) {
        // Collaborateur existant lié par apogee_user_id - vérifier les modifications
        const changes: string[] = [];
        
        if (apogeeUser.is_on === false && !existing.leaving_date) {
          actions.push({
            type: 'mark_departed',
            apogeeUser,
            existingCollaborator: existing,
            changes: ['Marquer comme parti (is_on=false)'],
          });
          continue;
        }
        
        if (apogeeUser.firstname && apogeeUser.firstname !== existing.first_name) {
          changes.push(`Prénom: ${existing.first_name} → ${apogeeUser.firstname}`);
        }
        if (apogeeUser.name && apogeeUser.name !== existing.last_name) {
          changes.push(`Nom: ${existing.last_name} → ${apogeeUser.name}`);
        }
        if (apogeeUser.email && apogeeUser.email !== existing.email) {
          changes.push(`Email: ${existing.email || '(vide)'} → ${apogeeUser.email}`);
        }
        if (apogeeUser.numtel && apogeeUser.numtel !== existing.phone) {
          changes.push(`Téléphone: ${existing.phone || '(vide)'} → ${apogeeUser.numtel}`);
        }
        
        if (changes.length > 0) {
          actions.push({ type: 'update', apogeeUser, existingCollaborator: existing, changes });
        }
      } else if (apogeeUser.is_on === true) {
        // Pas de lien apogee_user_id → chercher par nom/email
        const nameKey = `${norm(apogeeUser.firstname)}|${norm(apogeeUser.name)}`;
        const emailKey = apogeeUser.email ? norm(apogeeUser.email) : null;
        
        // Match par email (prioritaire) ou par nom exact
        let matchedCollab: RHCollaborator | undefined;
        
        if (emailKey && collabsByEmail.has(emailKey)) {
          matchedCollab = collabsByEmail.get(emailKey);
        }
        if (!matchedCollab && collabsByName.has(nameKey)) {
          const candidates = collabsByName.get(nameKey)!.filter(c => !matchedCollabIds.has(c.id));
          if (candidates.length === 1) {
            matchedCollab = candidates[0];
          }
        }
        
        if (matchedCollab && !matchedCollabIds.has(matchedCollab.id)) {
          // Doublon détecté → proposer de lier
          matchedCollabIds.add(matchedCollab.id);
          actions.push({
            type: 'link',
            apogeeUser,
            existingCollaborator: matchedCollab,
            changes: [
              `Lier à la fiche existante: ${matchedCollab.first_name} ${matchedCollab.last_name}`,
              matchedCollab.user_id ? '(utilisateur avec compte actif)' : '(fiche RH sans compte)',
              `Apogée ID: ${apogeeUser.id}`,
            ],
          });
        } else {
          // Aucun match → à créer
          actions.push({
            type: 'create',
            apogeeUser,
            changes: ['Nouveau collaborateur'],
          });
        }
      }
    }
    
    return actions;
  }, [apogeeUsers, collaborators]);
  
  // Mutation pour exécuter la synchronisation
  const syncMutation = useMutation({
    mutationFn: async (actionsToExecute: SyncAction[]) => {
      if (!agencyId) throw new Error('Agence non définie');
      
      const results = { created: 0, updated: 0, departed: 0, linked: 0 };
      
      for (const action of actionsToExecute) {
        if (action.type === 'create') {
          const user = action.apogeeUser;
          const userData = user.data as ApogeeUserData | null | undefined;
          
          const competences = [
            ...(userData?.universes || []),
            ...(userData?.skills || []),
          ];
          
          const { error } = await supabase.from('collaborators').insert({
            agency_id: agencyId,
            apogee_user_id: user.id,
            first_name: user.firstname || '',
            last_name: user.name || '',
            email: user.email || null,
            phone: user.numtel || null,
            type: mapApogeeTypeToCollaboratorType(user.type),
            role: user.type || 'autre',
            street: user.adresse || null,
            city: user.ville || null,
            postal_code: user.cp || null,
            is_registered_user: false,
          });
          
          if (error) throw error;
          results.created++;
          
        } else if (action.type === 'link' && action.existingCollaborator) {
          // Lier le collaborateur existant à l'utilisateur Apogée
          const user = action.apogeeUser;
          const { error } = await supabase
            .from('collaborators')
            .update({
              apogee_user_id: user.id,
              // Mettre à jour les champs vides depuis Apogée
              street: action.existingCollaborator.street || user.adresse || null,
              city: action.existingCollaborator.city || user.ville || null,
              postal_code: action.existingCollaborator.postal_code || user.cp || null,
              phone: action.existingCollaborator.phone || user.numtel || null,
            })
            .eq('id', action.existingCollaborator.id);
          
          if (error) throw error;
          results.linked++;
          
        } else if (action.type === 'update' && action.existingCollaborator) {
          const user = action.apogeeUser;
          
          const { error } = await supabase
            .from('collaborators')
            .update({
              first_name: user.firstname || action.existingCollaborator.first_name,
              last_name: user.name || action.existingCollaborator.last_name,
              email: user.email || action.existingCollaborator.email,
              phone: user.numtel || action.existingCollaborator.phone,
              street: user.adresse || action.existingCollaborator.street,
              city: user.ville || action.existingCollaborator.city,
              postal_code: user.cp || action.existingCollaborator.postal_code,
            })
            .eq('id', action.existingCollaborator.id);
          
          if (error) throw error;
          results.updated++;
          
        } else if (action.type === 'mark_departed' && action.existingCollaborator) {
          const { error } = await supabase
            .from('collaborators')
            .update({
              leaving_date: new Date().toISOString().split('T')[0],
            })
            .eq('id', action.existingCollaborator.id);
          
          if (error) throw error;
          results.departed++;
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      const messages: string[] = [];
      if (results.created > 0) messages.push(`${results.created} créé(s)`);
      if (results.linked > 0) messages.push(`${results.linked} lié(s)`);
      if (results.updated > 0) messages.push(`${results.updated} mis à jour`);
      if (results.departed > 0) messages.push(`${results.departed} marqué(s) comme parti(s)`);
      
      toast.success(`Synchronisation terminée: ${messages.join(', ')}`);
      
      queryClient.invalidateQueries({ queryKey: ['rh-collaborators'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
    },
    onError: (error) => {
      logError('Sync error:', error);
      toast.error('Erreur lors de la synchronisation');
    },
  });
  
  return {
    syncActions,
    loading: loadingUsers,
    totalChanges: syncActions.length,
    createCount: syncActions.filter(a => a.type === 'create').length,
    updateCount: syncActions.filter(a => a.type === 'update').length,
    departedCount: syncActions.filter(a => a.type === 'mark_departed').length,
    linkCount: syncActions.filter(a => a.type === 'link').length,
    executeSync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    refetch,
  };
}
