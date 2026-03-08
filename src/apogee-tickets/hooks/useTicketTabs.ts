/**
 * Hook pour gérer les onglets de tickets ouverts dans la vue Liste
 * - Maximum 10 onglets ouverts simultanément
 * - Persistance dans sessionStorage
 * - Auto-save des modifications avec debounce
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { safeMutation, safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { ApogeeTicket } from '../types';
import type { Json } from '@/integrations/supabase/types';

const MAX_TABS = 10;
const STORAGE_KEY = 'apogee-ticket-tabs';
const AUTO_SAVE_DELAY = 1200; // 1.2 seconds

export interface TicketTab {
  id: string;
  ticketNumber: number;
  label: string; // APO-XXX
}

// Field labels for history display (copy from useApogeeTickets)
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

const IGNORED_HISTORY_FIELDS = [
  'id', 'created_at', 'updated_at', 'last_modified_at', 'last_modified_by_user_id',
  'created_by_user_id', 'created_from', 'source_row_index', 'source_sheet',
  'source_support_ticket_id', 'support_initiator_user_id', 'external_key',
  'ticket_number', 'original_title', 'original_description', 'merged_into_ticket_id',
  'qualified_at', 'qualified_by', 'apogee_modules', 'apogee_ticket_statuses',
];

function formatHistoryValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  return String(value);
}

export function useTicketTabs() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();
  
  // Open tabs
  const [openTabs, setOpenTabs] = useState<TicketTab[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  
  // Currently active tab
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_KEY}-active`);
      return saved || null;
    } catch {
      return null;
    }
  });
  
  // Pending changes per ticket (for auto-save)
  const pendingChangesRef = useRef<Record<string, Partial<ApogeeTicket>>>({});
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Persist tabs to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(openTabs));
    } catch {
      // ignore
    }
  }, [openTabs]);
  
  // Persist active tab
  useEffect(() => {
    try {
      if (activeTabId) {
        sessionStorage.setItem(`${STORAGE_KEY}-active`, activeTabId);
      } else {
        sessionStorage.removeItem(`${STORAGE_KEY}-active`);
      }
    } catch {
      // ignore
    }
  }, [activeTabId]);
  
  // Open a ticket in a new tab
  const openTicketTab = useCallback((ticket: ApogeeTicket) => {
    setOpenTabs(prev => {
      // Check if already open
      const existing = prev.find(t => t.id === ticket.id);
      if (existing) {
        setActiveTabId(ticket.id);
        return prev;
      }
      
      // Check max tabs
      let newTabs = [...prev];
      if (newTabs.length >= MAX_TABS) {
        // Remove the oldest tab (first one)
        const removedTab = newTabs.shift();
        // Save any pending changes before removing
        if (removedTab) {
          flushPendingChanges(removedTab.id);
        }
      }
      
      // Add new tab
      const newTab: TicketTab = {
        id: ticket.id,
        ticketNumber: ticket.ticket_number || 0,
        label: `APO-${String(ticket.ticket_number || 0).padStart(3, '0')}`,
      };
      newTabs.push(newTab);
      setActiveTabId(ticket.id);
      
      return newTabs;
    });
  }, []);
  
  // Close a tab
  const closeTab = useCallback((ticketId: string) => {
    // Flush pending changes before closing
    flushPendingChanges(ticketId);
    
    setOpenTabs(prev => {
      const idx = prev.findIndex(t => t.id === ticketId);
      if (idx === -1) return prev;
      
      const newTabs = prev.filter(t => t.id !== ticketId);
      
      // If closing active tab, switch to another
      if (activeTabId === ticketId) {
        if (newTabs.length > 0) {
          // Switch to previous tab or first available
          const newActiveIdx = Math.min(idx, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIdx]?.id || null);
        } else {
          setActiveTabId(null);
        }
      }
      
      return newTabs;
    });
  }, [activeTabId]);
  
  // Close all tabs
  const closeAllTabs = useCallback(() => {
    // Flush all pending changes
    openTabs.forEach(tab => flushPendingChanges(tab.id));
    setOpenTabs([]);
    setActiveTabId(null);
  }, [openTabs]);
  
  // Update mutation for auto-save
  const updateMutation = useMutation({
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
      
      const updatePayload: Record<string, unknown> = { ...updates };
      
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
        const entries: Array<{
          ticket_id: string;
          user_id: string;
          action_type: string;
          old_value: string | null;
          new_value: string | null;
          metadata: Json;
        }> = [];

        for (const [field, newValue] of Object.entries(updates)) {
          if (IGNORED_HISTORY_FIELDS.includes(field)) continue;
          // Skip kanban_status - already logged by updateTicketKanbanStatus in useApogeeTickets
          if (field === 'kanban_status') continue;

          const oldValue = oldTicket[field as keyof ApogeeTicket];
          const oldFormatted = formatHistoryValue(oldValue);
          const newFormatted = formatHistoryValue(newValue);

          if (oldFormatted !== newFormatted) {
            const fieldLabel = FIELD_LABELS[field] || field;

            entries.push({
              ticket_id: id,
              user_id: user.id,
              action_type: 'field_update',
              old_value: oldFormatted,
              new_value: newFormatted,
              metadata: { field, fieldLabel } as Json,
            });
          }
        }

        if (entries.length > 0) {
          await supabase.from('apogee_ticket_history').insert(entries);
        }
      }
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket-history', variables.id] });
    },
    onError: (error: Error, variables) => {
      logError('ticket-tabs', 'Auto-save failed', error);
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['apogee-ticket', variables.id] });
      }
      import('sonner').then(({ toast }) => {
        toast.error('Erreur de sauvegarde du ticket', { description: error.message });
      });
    },
  });

  // Apply optimistic updates instantly to cache (UI responsiveness)
  const applyOptimisticTicketUpdate = useCallback((ticketId: string, updates: Partial<ApogeeTicket>) => {
    queryClient.setQueriesData<ApogeeTicket[]>({ queryKey: ['apogee-tickets'] }, (current) => {
      if (!Array.isArray(current)) return current;
      return current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, ...updates } : ticket
      );
    });

    queryClient.setQueryData<ApogeeTicket | null>(['apogee-ticket', ticketId], (current) => {
      if (!current) return current;
      return { ...current, ...updates };
    });
  }, [queryClient]);
  
  // Flush pending changes immediately
  const flushPendingChanges = useCallback(async (ticketId: string) => {
    const pending = pendingChangesRef.current[ticketId];
    if (pending && Object.keys(pending).length > 0) {
      // Clear timeout
      if (saveTimeoutRef.current[ticketId]) {
        clearTimeout(saveTimeoutRef.current[ticketId]);
        delete saveTimeoutRef.current[ticketId];
      }
      
      // Clear pending first to avoid double-flush
      delete pendingChangesRef.current[ticketId];
      
      // Save immediately and await
      try {
        await updateMutation.mutateAsync({ id: ticketId, ...pending });
      } catch (error) {
        logError('ticket-tabs', 'Flush save failed', error);
      }
    }
  }, [updateMutation]);
  
  // Queue a change for auto-save (debounced)
  const queueChange = useCallback((ticketId: string, updates: Partial<ApogeeTicket>) => {
    // Optimistic UI first
    applyOptimisticTicketUpdate(ticketId, updates);

    // Merge with pending changes
    pendingChangesRef.current[ticketId] = {
      ...pendingChangesRef.current[ticketId],
      ...updates,
    };
    
    // Clear existing timeout
    if (saveTimeoutRef.current[ticketId]) {
      clearTimeout(saveTimeoutRef.current[ticketId]);
    }
    
    // Set new timeout
    saveTimeoutRef.current[ticketId] = setTimeout(() => {
      flushPendingChanges(ticketId);
    }, AUTO_SAVE_DELAY);
  }, [flushPendingChanges, applyOptimisticTicketUpdate]);
  
  // Flush all on unmount
  useEffect(() => {
    return () => {
      Object.keys(pendingChangesRef.current).forEach(flushPendingChanges);
      Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);
  
  return {
    openTabs,
    activeTabId,
    setActiveTabId,
    openTicketTab,
    closeTab,
    closeAllTabs,
    queueChange,
    flushPendingChanges,
    isSaving: updateMutation.isPending,
  };
}
