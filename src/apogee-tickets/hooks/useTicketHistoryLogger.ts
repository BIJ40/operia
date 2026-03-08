/**
 * Hook pour logger automatiquement toutes les modifications de tickets dans l'historique
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';
import type { ApogeeTicket } from '../types';

// Mapping des noms de champs vers des labels lisibles
const FIELD_LABELS: Record<string, string> = {
  element_concerne: 'Titre',
  description: 'Description',
  module: 'Module',
  kanban_status: 'Statut',
  heat_priority: 'Priorité Heat',
  owner_side: 'Porté par',
  h_min: 'Temps min (h)',
  h_max: 'Temps max (h)',
  severity: 'Sévérité',
  ticket_type: 'Type',
  action_type: 'Type d\'action',
  theme: 'Thème',
  module_area: 'Zone module',
  notes_internes: 'Notes internes',
  impact_tags: 'Tags d\'impact',
  hca_code: 'Code HCA',
  reported_by: 'Rapporté par',
  is_qualified: 'Qualifié',
  needs_completion: 'À compléter',
};

// Champs à ignorer dans l'historique (métadonnées internes)
const IGNORED_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'last_modified_at',
  'last_modified_by_user_id',
  'created_by_user_id',
  'created_from',
  'source_row_index',
  'source_sheet',
  'source_support_ticket_id',
  'support_initiator_user_id',
  'external_key',
  'ticket_number',
  'original_title',
  'original_description',
  'merged_into_ticket_id',
  'qualified_at',
  'qualified_by',
];

// Formater une valeur pour l'affichage
function formatValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : null;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  return String(value);
}

interface LogHistoryParams {
  ticketId: string;
  oldTicket: Partial<ApogeeTicket> | null;
  newValues: Partial<ApogeeTicket>;
}

export function useTicketHistoryLogger() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, oldTicket, newValues }: LogHistoryParams) => {
      if (!user?.id) return;
      
      const entries: Array<{
        ticket_id: string;
        user_id: string;
        action_type: string;
        old_value: string | null;
        new_value: string | null;
        metadata: Json;
      }> = [];
      
      // Comparer chaque champ modifié
      for (const [field, newValue] of Object.entries(newValues)) {
        // Ignorer les champs internes
        if (IGNORED_FIELDS.includes(field)) continue;
        
        const oldValue = oldTicket?.[field as keyof ApogeeTicket];
        
        // Vérifier si la valeur a réellement changé
        const oldFormatted = formatValue(field, oldValue);
        const newFormatted = formatValue(field, newValue);
        
        if (oldFormatted !== newFormatted) {
          const fieldLabel = FIELD_LABELS[field] || field;
          
          entries.push({
            ticket_id: ticketId,
            user_id: user.id,
            action_type: 'field_update',
            old_value: oldFormatted,
            new_value: newFormatted,
            metadata: { field, fieldLabel } as Json,
          });
        }
      }
      
      // Insérer toutes les entrées d'historique
      if (entries.length > 0) {
        const { error } = await supabase
          .from('apogee_ticket_history')
          .insert(entries);
        
        if (error) {
          logError('ticket-history', 'Error logging history', error);
        }
      }
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
    },
  });
}

// Hook pour logger un changement de statut spécifiquement
export function useLogStatusChange() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      oldStatus, 
      newStatus 
    }: { 
      ticketId: string; 
      oldStatus: string; 
      newStatus: string;
    }) => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('apogee_ticket_history')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          action_type: 'status_change',
          old_value: oldStatus,
          new_value: newStatus,
          metadata: {} as Json,
        });
      
      if (error) {
        logError('ticket-history', 'Error logging status change', error);
      }
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
    },
  });
}

// Hook pour logger l'ajout d'un commentaire
export function useLogCommentAdded() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      commentPreview 
    }: { 
      ticketId: string; 
      commentPreview: string;
    }) => {
      if (!user?.id) return;
      
      // Tronquer le commentaire pour l'affichage
      const preview = commentPreview.length > 100 
        ? commentPreview.substring(0, 100) + '...' 
        : commentPreview;
      
      const { error } = await supabase
        .from('apogee_ticket_history')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          action_type: 'comment_added',
          old_value: null,
          new_value: preview,
          metadata: {} as Json,
        });
      
      if (error) {
        logError('ticket-history', 'Error logging comment', error);
      }
    },
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
    },
  });
}
