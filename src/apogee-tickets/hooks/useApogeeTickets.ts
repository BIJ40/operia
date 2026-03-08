/**
 * Hook principal pour la gestion des tickets Apogée
 * Inclut souscription Realtime pour rafraîchissement automatique
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';
import { safeMutation, safeQuery } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { notifyNewTicket } from '@/utils/notifyNewTicket';
import type { Json } from '@/integrations/supabase/types';
import type {
  ApogeeTicket,
  ApogeeTicketStatus,
  ApogeeModule,
  ApogeePriority,
  ApogeeOwnerSide,
  ApogeeTicketInsert,
  ApogeeTicketComment,
  ApogeeTicketCommentInsert,
  TicketFilters,
} from '../types';

// Field labels for history display
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

// Fields to ignore in history logging
const IGNORED_HISTORY_FIELDS = [
  'id', 'created_at', 'updated_at', 'last_modified_at', 'last_modified_by_user_id',
  'created_by_user_id', 'created_from', 'source_row_index', 'source_sheet',
  'source_support_ticket_id', 'support_initiator_user_id', 'external_key',
  'ticket_number', 'original_title', 'original_description', 'merged_into_ticket_id',
  'qualified_at', 'qualified_by', 'apogee_modules', 'apogee_ticket_statuses',
];

// Format value for display
function formatHistoryValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  return String(value);
}

// Log ticket changes to history
async function logTicketChanges(
  ticketId: string,
  userId: string,
  oldTicket: ApogeeTicket,
  newValues: Partial<ApogeeTicket>
) {
  const entries: Array<{
    ticket_id: string;
    user_id: string;
    action_type: string;
    old_value: string | null;
    new_value: string | null;
    metadata: Json;
  }> = [];

  for (const [field, newValue] of Object.entries(newValues)) {
    if (IGNORED_HISTORY_FIELDS.includes(field)) continue;

    const oldValue = oldTicket[field as keyof ApogeeTicket];
    const oldFormatted = formatHistoryValue(oldValue);
    const newFormatted = formatHistoryValue(newValue);

    if (oldFormatted !== newFormatted) {
      const fieldLabel = FIELD_LABELS[field] || field;
      
      // Determine action type based on field
      let actionType = 'field_update';
      if (field === 'kanban_status') actionType = 'status_change';

      entries.push({
        ticket_id: ticketId,
        user_id: userId,
        action_type: actionType,
        old_value: oldFormatted,
        new_value: newFormatted,
        metadata: { field, fieldLabel } as Json,
      });
    }
  }

  if (entries.length > 0) {
    const { error } = await supabase
      .from('apogee_ticket_history')
      .insert(entries);

    if (error) {
      logError('ticket-history', 'Error logging history', error);
    }
  }
}

export function useApogeeTickets(filters?: TicketFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['apogee-ticket-statuses'],
    queryFn: async (): Promise<ApogeeTicketStatus[]> => {
      const result = await safeQuery<ApogeeTicketStatus[]>(
        supabase
          .from('apogee_ticket_statuses')
          .select('*')
          .order('display_order'),
        'APOGEE_STATUSES_LOAD'
      );
      return result.success ? (result.data ?? []) : [];
    },
  });

  // Fetch modules
  const { data: modules = [] } = useQuery({
    queryKey: ['apogee-modules'],
    queryFn: async (): Promise<ApogeeModule[]> => {
      const result = await safeQuery<ApogeeModule[]>(
        supabase
          .from('apogee_modules')
          .select('*')
          .order('display_order'),
        'APOGEE_MODULES_LOAD'
      );
      return result.success ? (result.data ?? []) : [];
    },
  });

  // Fetch priorities
  const { data: priorities = [] } = useQuery({
    queryKey: ['apogee-priorities'],
    queryFn: async (): Promise<ApogeePriority[]> => {
      const result = await safeQuery<ApogeePriority[]>(
        supabase
          .from('apogee_priorities')
          .select('*')
          .order('display_order'),
        'APOGEE_PRIORITIES_LOAD'
      );
      return result.success ? (result.data ?? []) : [];
    },
  });

  // Fetch owner sides (Porté par)
  const { data: ownerSides = [] } = useQuery({
    queryKey: ['apogee-owner-sides'],
    queryFn: async (): Promise<ApogeeOwnerSide[]> => {
      const result = await safeQuery<ApogeeOwnerSide[]>(
        supabase
          .from('apogee_owner_sides')
          .select('*')
          .order('display_order'),
        'APOGEE_OWNER_SIDES_LOAD'
      );
      return result.success ? (result.data ?? []) : [];
    },
  });

  // Fetch tickets with filters
  const {
    data: tickets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['apogee-tickets', filters],
    queryFn: async (): Promise<ApogeeTicket[]> => {
      let query = supabase
        .from('apogee_tickets')
        .select(`
          *,
          apogee_modules(*),
          apogee_ticket_statuses(*),
          apogee_ticket_comments(count)
        `)
        .order('created_at', { ascending: false });


       // Modules (multi pour la vue Liste, single pour compat Kanban)
       if (filters?.modules && filters.modules.length > 0) {
         query = query.in('module', filters.modules);
       } else if (filters?.module) {
         if (filters.module === '__none__') {
           query = query.is('module', null);
         } else {
           query = query.eq('module', filters.module);
         }
       }

       // Statuts (multi)
       if (filters?.kanban_statuses && filters.kanban_statuses.length > 0) {
         query = query.in('kanban_status', filters.kanban_statuses);
       }

       // Date de création
       if (filters?.created_at_from) {
         query = query.gte('created_at', filters.created_at_from);
       }
       if (filters?.created_at_to) {
         query = query.lte('created_at', filters.created_at_to);
       }

        if (filters?.owner_side) {
          query = query.eq('owner_side', filters.owner_side);
        }
        if (filters?.reported_by) {
          // Certains tickets historiques ont reported_by avec une casse différente (ex: "Eric" vs "ERIC").
          // On utilise ilike (case-insensitive) pour éviter de "perdre" des tickets en liste.
          query = query.ilike('reported_by', filters.reported_by);
        }
        if (filters?.origins && filters.origins.length > 0) {
          // Filtre multi-origines avec OR case-insensitive
          // APOGEE inclut HUGO, FLORIAN inclut MARIE et MATHILDE
          const expandedOrigins = filters.origins.flatMap(o => {
            if (o === 'APOGEE') return ['APOGEE', 'HUGO'];
            if (o === 'FLORIAN') return ['FLORIAN', 'MARIE', 'MATHILDE'];
            return [o];
          });
          // Inclure aussi les variantes avec préfixes (ex: "HUGO (VIA FLORIAN)")
          const originsFilter = expandedOrigins.map(o => `reported_by.ilike.${o}%`).join(',');
          query = query.or(originsFilter);
        }
       if (filters?.needs_completion) {
         // Exclure les tickets EN_PROD (TRAITÉ/PUBLIÉ) qui sont considérés complets
         query = query.or('needs_completion.eq.true,kanban_status.eq.IMPORT')
                      .neq('kanban_status', 'EN_PROD');
       }
       if (filters?.search) {
         // Search in title, description, and ticket reference (APO-XXX)
         const searchTerm = filters.search.trim();
         // Check if search is a number (for ticket_number)
         const numericSearch = searchTerm.replace(/[^0-9]/g, '');
         if (numericSearch && /^(apo-?)?\d+$/i.test(searchTerm)) {
           query = query.eq('ticket_number', parseInt(numericSearch, 10));
         } else {
           query = query.or(`element_concerne.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
         }
       }
       if (filters?.is_qualified !== undefined) {
         query = query.eq('is_qualified', filters.is_qualified);
       }

       // Filtre Roadmap
       if (filters?.roadmap_only) {
         query = query.eq('roadmap_enabled', true);
       }

       // Priorité (exact ou range)
       if (filters?.heat_priority_exact !== undefined) {
         query = query.eq('heat_priority', filters.heat_priority_exact);
       } else {
         if (filters?.heat_priority_min !== undefined && filters.heat_priority_min > 0) {
           query = query.gte('heat_priority', filters.heat_priority_min);
         }
         if (filters?.heat_priority_max !== undefined && filters.heat_priority_max < 12) {
           query = query.lte('heat_priority', filters.heat_priority_max);
         }
       }

      const result = await safeQuery<any[]>(query, 'APOGEE_TICKETS_LOAD');
      
      if (!result.success) {
        return [];
      }
      
      // Map comment count to _count field
      let data = (result.data || []).map((ticket: any) => ({
        ...ticket,
        _count: {
          comments: ticket.apogee_ticket_comments?.[0]?.count || 0
        }
      })) as ApogeeTicket[];

      // Filtrage client-side pour missing_field
      if (filters?.missing_field) {
        switch (filters.missing_field) {
          case 'complete':
            data = data.filter(t => 
              t.module && 
              t.heat_priority !== null && t.heat_priority !== undefined &&
              (t.h_min !== null || t.h_max !== null) &&
              t.description
            );
            break;
          case 'incomplete':
            data = data.filter(t => 
              !t.module || 
              t.heat_priority === null || t.heat_priority === undefined ||
              (t.h_min === null && t.h_max === null) ||
              !t.description
            );
            break;
          case 'no_module':
            data = data.filter(t => !t.module);
            break;
          case 'no_heat':
            data = data.filter(t => t.heat_priority === null || t.heat_priority === undefined);
            break;
          case 'no_hours':
            data = data.filter(t => t.h_min === null && t.h_max === null);
            break;
          case 'no_description':
            data = data.filter(t => !t.description);
            break;
        }
      }

      // Filtrage client-side pour tags
      if (filters?.tags && filters.tags.length > 0) {
        data = data.filter(t => 
          t.impact_tags && t.impact_tags.some(tag => filters.tags!.includes(tag))
        );
      }

      return data;
    },
  });

  // Souscription Realtime pour rafraîchir les tickets automatiquement
  useEffect(() => {
    const channel = supabase
      .channel('apogee-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apogee_tickets',
        },
        () => {
          // Rafraîchir les tickets et les vues quand un ticket est modifié
          queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['apogee-ticket-views'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (ticket: ApogeeTicketInsert) => {
      const result = await safeMutation<ApogeeTicket>(
        supabase
          .from('apogee_tickets')
          .insert({
            ...ticket,
            created_by_user_id: user?.id,
            needs_completion: !ticket.module || ticket.heat_priority === null || ticket.heat_priority === undefined,
          })
          .select()
          .single(),
        'APOGEE_TICKET_CREATE'
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création ticket');
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      successToast('Ticket créé');

      // Fire-and-forget notification
      if (data) {
        notifyNewTicket({
          ticket_id: data.id,
          ticket_number: data.ticket_number,
          subject: data.element_concerne,
          description: data.description || undefined,
          heat_priority: data.heat_priority,
          module: data.module || undefined,
          created_from: data.created_from,
        });
      }
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  // Update ticket with automatic history logging
  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApogeeTicket> & { id: string }) => {
      // Fetch current ticket state for history comparison
      const currentTicketResult = await safeQuery<ApogeeTicket>(
        supabase
          .from('apogee_tickets')
          .select('*')
          .eq('id', id)
          .maybeSingle(),
        'APOGEE_TICKET_FETCH_FOR_HISTORY'
      );
      
      const oldTicket = currentTicketResult.success ? currentTicketResult.data : null;
      
      const updatePayload: Record<string, any> = { ...updates };
      
      const hasCompletionFields = 'module' in updates || 'heat_priority' in updates || 'owner_side' in updates;
      
      if (hasCompletionFields && oldTicket) {
        const finalModule = 'module' in updates ? updates.module : oldTicket.module;
        const finalHeatPriority = 'heat_priority' in updates ? updates.heat_priority : oldTicket.heat_priority;
        updatePayload.needs_completion = !finalModule || finalHeatPriority === null || finalHeatPriority === undefined;
      }

      const result = await safeMutation<ApogeeTicket>(
        supabase
          .from('apogee_tickets')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single(),
        'APOGEE_TICKET_UPDATE'
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour ticket');
      }
      
      // Log changes to history
      if (user?.id && oldTicket) {
        await logTicketChanges(id, user.id, oldTicket, updates);
      }
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', variables.id] });
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  // Update kanban status (drag & drop) with history logging
  const updateKanbanStatus = useMutation({
    mutationFn: async ({ ticketId, newStatus, oldStatus }: { ticketId: string; newStatus: string; oldStatus?: string }) => {
      // Get current status if not provided
      let previousStatus = oldStatus;
      if (!previousStatus) {
        const { data: currentTicket } = await supabase
          .from('apogee_tickets')
          .select('kanban_status')
          .eq('id', ticketId)
          .maybeSingle();
        previousStatus = currentTicket?.kanban_status;
      }
      
      const result = await safeMutation<ApogeeTicket>(
        supabase
          .from('apogee_tickets')
          .update({ kanban_status: newStatus })
          .eq('id', ticketId)
          .select()
          .single(),
        'APOGEE_TICKET_KANBAN_UPDATE'
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour statut');
      }
      
      // Log status change to history
      if (user?.id && previousStatus && previousStatus !== newStatus) {
        await supabase
          .from('apogee_ticket_history')
          .insert({
            ticket_id: ticketId,
            user_id: user.id,
            action_type: 'status_change',
            old_value: previousStatus,
            new_value: newStatus,
            metadata: { field: 'kanban_status', fieldLabel: 'Statut' } as Json,
          });
      }
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', variables.ticketId] });
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  // Delete ticket
  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const result = await safeMutation<null>(
        supabase
          .from('apogee_tickets')
          .delete()
          .eq('id', id),
        'APOGEE_TICKET_DELETE'
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression ticket');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      successToast('Ticket supprimé');
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  return {
    tickets,
    statuses,
    modules,
    priorities,
    ownerSides,
    isLoading,
    refetch,
    createTicket,
    updateTicket,
    updateKanbanStatus,
    deleteTicket,
  };
}

// Hook for single ticket with comments
export function useApogeeTicket(ticketId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['apogee-ticket', ticketId],
    queryFn: async (): Promise<ApogeeTicket | null> => {
      if (!ticketId) return null;
      
      const result = await safeQuery<ApogeeTicket>(
        supabase
          .from('apogee_tickets')
          .select(`
            *,
            apogee_modules(*),
            apogee_ticket_statuses(*)
          `)
          .eq('id', ticketId)
          .maybeSingle(),
        'APOGEE_TICKET_SINGLE_LOAD'
      );
      
      return result.success ? result.data ?? null : null;
    },
    enabled: !!ticketId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['apogee-ticket-comments', ticketId],
    queryFn: async (): Promise<ApogeeTicketComment[]> => {
      if (!ticketId) return [];
      
      const result = await safeQuery<ApogeeTicketComment[]>(
        supabase
          .from('apogee_ticket_comments')
          .select(`
            *,
            profiles:created_by_user_id(first_name, last_name)
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true }),
        'APOGEE_TICKET_COMMENTS_LOAD'
      );
      
      return result.success ? (result.data ?? []) : [];
    },
    enabled: !!ticketId,
  });

  const addComment = useMutation({
    mutationFn: async (comment: ApogeeTicketCommentInsert) => {
      if (!user?.id) {
        throw new Error('Votre session a expiré, reconnectez-vous puis réessayez');
      }

      const result = await safeMutation<ApogeeTicketComment>(
        supabase
          .from('apogee_ticket_comments')
          .insert({
            ...comment,
            created_by_user_id: user.id,
          })
          .select()
          .maybeSingle(),
        'APOGEE_TICKET_COMMENT_CREATE'
      );
      
      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Erreur ajout commentaire');
      }
      
      // Log comment added to history
      if (user?.id && comment.ticket_id) {
        const preview = comment.body.length > 100 
          ? comment.body.substring(0, 100) + '...' 
          : comment.body;
        
        await supabase
          .from('apogee_ticket_history')
          .insert({
            ticket_id: comment.ticket_id,
            user_id: user.id,
            action_type: 'comment_added',
            old_value: null,
            new_value: preview,
            metadata: {} as Json,
          });
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-comments', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', ticketId] });
      // Update ticket's last_modified to trigger notification for others
      if (ticketId) {
        supabase
          .from('apogee_tickets')
          .update({ 
            last_modified_at: new Date().toISOString(),
            last_modified_by_user_id: user?.id 
          })
          .eq('id', ticketId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
          });
      }
      successToast('Commentaire ajouté');
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      if (!user?.id) {
        throw new Error('Vous devez être connecté pour modifier un commentaire');
      }

      const result = await safeMutation<unknown>(
        supabase
          .from('apogee_ticket_comments')
          .update({
            body: body.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', commentId)
          .eq('created_by_user_id', user.id), // Only allow editing own comments
        'APOGEE_TICKET_COMMENT_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur modification commentaire');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-comments', ticketId] });
      // Update ticket's last_modified to trigger notification for others
      if (ticketId) {
        supabase
          .from('apogee_tickets')
          .update({ 
            last_modified_at: new Date().toISOString(),
            last_modified_by_user_id: user?.id 
          })
          .eq('id', ticketId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
          });
      }
      successToast('Commentaire modifié');
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });

  return {
    ticket,
    comments,
    isLoading,
    addComment,
    updateComment,
  };
}

// Hook for incomplete tickets - détection dynamique côté client
export function useIncompleteTickets() {
  const { tickets: allTickets, isLoading, ...rest } = useApogeeTickets();
  
  // Filtrer côté client les tickets vraiment incomplets
  // Un ticket est incomplet s'il manque: module, heat_priority, h_min/h_max (temps), owner_side (PEC)
  // Et qu'il n'est pas en statut final (EN_PROD, CLOS, REFUSE)
  const FINAL_STATUSES = ['EN_PROD', 'CLOS', 'REFUSE'];
  
  const incompleteTickets = allTickets.filter(ticket => {
    // Ignorer les tickets en statut final
    if (FINAL_STATUSES.includes(ticket.kanban_status)) return false;
    
    // Vérifier les champs manquants
    const missingModule = !ticket.module;
    const missingHeatPriority = ticket.heat_priority === null || ticket.heat_priority === undefined;
    const missingTime = (ticket.h_min === null || ticket.h_min === undefined) && 
                        (ticket.h_max === null || ticket.h_max === undefined);
    const missingOwnerSide = !ticket.owner_side;
    
    return missingModule || missingHeatPriority || missingTime || missingOwnerSide;
  });

  return {
    tickets: incompleteTickets,
    isLoading,
    ...rest
  };
}
