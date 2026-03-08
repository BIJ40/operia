/**
 * Hook de synchronisation Apogée → Collaborateurs
 * Compare les utilisateurs Apogée avec les collaborateurs existants
 * et génère les actions de sync (créer, mettre à jour, marquer comme parti)
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
  type: 'create' | 'update' | 'mark_departed';
  apogeeUser: ApogeeUserFull;
  existingCollaborator?: RHCollaborator;
  changes?: string[];
}

interface UseApogeeSyncOptions {
  agencySlug?: string;
  collaborators: RHCollaborator[];
}

export function useApogeeSync({ agencySlug, collaborators }: UseApogeeSyncOptions) {
  const queryClient = useQueryClient();
  const { agencyId } = useAuth();
  
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
    
    // Filtrer les utilisateurs système avant le traitement
    const validApogeeUsers = (apogeeUsers as ApogeeUserFull[]).filter(user => {
      // Exclure les comptes système (Dynoco Admin, etc.)
      if (user.firstname?.toLowerCase() === 'dynoco') return false;
      if (user.id === 1) return false; // Compte admin système
      return true;
    });
    
    for (const apogeeUser of validApogeeUsers) {
      const existing = collaboratorsByApogeeId.get(apogeeUser.id);
      
      if (existing) {
        // Collaborateur existant - vérifier les modifications
        const changes: string[] = [];
        
        // Vérifier is_on=false → marquer comme parti
        if (apogeeUser.is_on === false && !existing.leaving_date) {
          actions.push({
            type: 'mark_departed',
            apogeeUser,
            existingCollaborator: existing,
            changes: ['Marquer comme parti (is_on=false)'],
          });
          continue;
        }
        
        // Comparer les champs
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
          actions.push({
            type: 'update',
            apogeeUser,
            existingCollaborator: existing,
            changes,
          });
        }
      } else if (apogeeUser.is_on === true) {
        // Nouvel utilisateur actif → à créer
        actions.push({
          type: 'create',
          apogeeUser,
          changes: ['Nouveau collaborateur'],
        });
      }
      // Si is_on=false et pas dans la base → on ignore (ancien salarié jamais synchronisé)
    }
    
    return actions;
  }, [apogeeUsers, collaborators]);
  
  // Mutation pour exécuter la synchronisation
  const syncMutation = useMutation({
    mutationFn: async (actionsToExecute: SyncAction[]) => {
      if (!agencyId) throw new Error('Agence non définie');
      
      const results = { created: 0, updated: 0, departed: 0 };
      
      for (const action of actionsToExecute) {
        if (action.type === 'create') {
          const user = action.apogeeUser;
          const userData = user.data as ApogeeUserData | null | undefined;
          
          // Fusionner universes + skills pour les compétences
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
            // hiring_date: NON importé - c'est la date de saisie dans Apogée, pas la date réelle du contrat
            is_registered_user: false,
          });
          
          if (error) throw error;
          results.created++;
          
          // TODO: Créer rh_competencies avec competences si besoin
          
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
    executeSync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    refetch,
  };
}
