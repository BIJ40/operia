/**
 * Hook principal pour la gestion des tickets Apogée
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  ApogeeTicket,
  ApogeeTicketStatus,
  ApogeeModule,
  ApogeePriority,
  ApogeeImpactTag,
  ApogeeTicketInsert,
  ApogeeTicketComment,
  ApogeeTicketCommentInsert,
  TicketFilters,
} from '../types';

export function useApogeeTickets(filters?: TicketFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['apogee-ticket-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_ticket_statuses')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeTicketStatus[];
    },
  });

  // Fetch modules
  const { data: modules = [] } = useQuery({
    queryKey: ['apogee-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_modules')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeModule[];
    },
  });

  // Fetch priorities
  const { data: priorities = [] } = useQuery({
    queryKey: ['apogee-priorities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_priorities')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeePriority[];
    },
  });

  // Fetch impact tags
  const { data: impactTags = [] } = useQuery({
    queryKey: ['apogee-impact-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_impact_tags')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as ApogeeImpactTag[];
    },
  });

  // Fetch tickets with filters
  const {
    data: tickets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['apogee-tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('apogee_tickets')
        .select(`
          *,
          apogee_modules(*),
          apogee_priorities(*),
          apogee_ticket_statuses(*),
          apogee_ticket_comments(count)
        `)
        .order('created_at', { ascending: false });

      if (filters?.module) {
        query = query.eq('module', filters.module);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.owner_side) {
        query = query.eq('owner_side', filters.owner_side);
      }
      if (filters?.needs_completion) {
        query = query.eq('needs_completion', true);
      }
      if (filters?.search) {
        query = query.or(`element_concerne.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters?.is_qualified !== undefined) {
        query = query.eq('is_qualified', filters.is_qualified);
      }
      if (filters?.impact_tag) {
        query = query.contains('impact_tags', [filters.impact_tag]);
      }
      if (filters?.heat_priority_min !== undefined) {
        query = query.gte('heat_priority', filters.heat_priority_min);
      }
      if (filters?.heat_priority_max !== undefined) {
        query = query.lte('heat_priority', filters.heat_priority_max);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map comment count to _count field
      return (data || []).map((ticket: any) => ({
        ...ticket,
        _count: {
          comments: ticket.apogee_ticket_comments?.[0]?.count || 0
        }
      })) as ApogeeTicket[];
    },
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (ticket: ApogeeTicketInsert) => {
      const { data, error } = await supabase
        .from('apogee_tickets')
        .insert({
          ...ticket,
          created_by_user_id: user?.id,
          needs_completion: !ticket.module || !ticket.priority || !ticket.owner_side,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      toast.success('Ticket créé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update ticket
  const updateTicket = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApogeeTicket> & { id: string }) => {
      const needsCompletion = 
        (updates.module === null || updates.module === undefined) ||
        (updates.priority === null || updates.priority === undefined) ||
        (updates.owner_side === null || updates.owner_side === undefined);

      const { data, error } = await supabase
        .from('apogee_tickets')
        .update({ ...updates, needs_completion: needsCompletion })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update kanban status (drag & drop)
  const updateKanbanStatus = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: string }) => {
      const { data, error } = await supabase
        .from('apogee_tickets')
        .update({ kanban_status: newStatus })
        .eq('id', ticketId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete ticket
  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apogee_tickets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      toast.success('Ticket supprimé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    tickets,
    statuses,
    modules,
    priorities,
    impactTags,
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
    queryFn: async () => {
      if (!ticketId) return null;
      const { data, error } = await supabase
        .from('apogee_tickets')
        .select(`
          *,
          apogee_modules(*),
          apogee_priorities(*),
          apogee_ticket_statuses(*)
        `)
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data as ApogeeTicket;
    },
    enabled: !!ticketId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['apogee-ticket-comments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from('apogee_ticket_comments')
        .select(`
          *,
          profiles:created_by_user_id(first_name, last_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ApogeeTicketComment[];
    },
    enabled: !!ticketId,
  });

  const addComment = useMutation({
    mutationFn: async (comment: ApogeeTicketCommentInsert) => {
      const { data, error } = await supabase
        .from('apogee_ticket_comments')
        .insert({
          ...comment,
          created_by_user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-comments', ticketId] });
      toast.success('Commentaire ajouté');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    ticket,
    comments,
    isLoading,
    addComment,
  };
}

// Hook for incomplete tickets
export function useIncompleteTickets() {
  return useApogeeTickets({ needs_completion: true });
}
