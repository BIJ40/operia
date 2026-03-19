/**
 * useSocialCalendar — CRUD hook for social_calendar_entries.
 * 
 * Convention : calendar entry = exécution de planning.
 * Propagation : calendar published → variant published + published_at set.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CalendarEntry {
  id: string;
  agency_id: string;
  suggestion_id: string;
  variant_id: string | null;
  scheduled_for: string;
  platform: string;
  status: string;
  published_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSocialCalendar(monthKey: string) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['social-calendar', agencyId, monthKey],
    enabled: !!agencyId && !!monthKey,
    staleTime: 60_000,
    queryFn: async (): Promise<CalendarEntry[]> => {
      if (!agencyId) return [];

      // Parse month key to get date range
      const [year, month] = monthKey.split('-').map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('social_calendar_entries')
        .select('*')
        .eq('agency_id', agencyId)
        .gte('scheduled_for', start)
        .lte('scheduled_for', end)
        .neq('status', 'cancelled')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return (data || []) as CalendarEntry[];
    },
  });
}

// ─── Schedule a suggestion ───────────────────────────────────
// GUARD: suggestion must be approved before scheduling
export function useScheduleSuggestion() {
  const { agencyId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, variantId, platform, scheduledFor, monthKey }: {
      suggestionId: string;
      variantId?: string | null;
      platform: string;
      scheduledFor: string;
      monthKey: string;
    }) => {
      // 1. Verify suggestion is approved
      const { data: suggestion, error: fetchErr } = await supabase
        .from('social_content_suggestions')
        .select('status')
        .eq('id', suggestionId)
        .eq('agency_id', agencyId)
        .single();

      if (fetchErr || !suggestion) throw new Error('Suggestion introuvable');
      if (suggestion.status !== 'approved') {
        throw new Error('Seules les suggestions approuvées peuvent être planifiées');
      }

      // 2. Insert calendar entry
      const { error } = await supabase
        .from('social_calendar_entries')
        .insert({
          agency_id: agencyId,
          suggestion_id: suggestionId,
          variant_id: variantId || null,
          platform,
          scheduled_for: scheduledFor,
          status: 'scheduled',
          created_by: user?.id || null,
        });

      if (error) throw error;

      // 3. Propagate: variant → scheduled
      if (variantId) {
        await supabase
          .from('social_post_variants')
          .update({ status: 'scheduled' })
          .eq('id', variantId)
          .eq('agency_id', agencyId);
      }

      return { monthKey };
    },
    onSuccess: ({ monthKey }) => {
      queryClient.invalidateQueries({ queryKey: ['social-calendar', agencyId, monthKey] });
      queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
      toast.success('Publication planifiée');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erreur lors de la planification');
    },
  });
}

// ─── Mark as published ───────────────────────────────────────
export function useMarkPublished() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, variantId, monthKey }: {
      entryId: string;
      variantId: string | null;
      monthKey: string;
    }) => {
      const now = new Date().toISOString();

      // Update calendar entry
      const { error: calErr } = await supabase
        .from('social_calendar_entries')
        .update({ status: 'published', published_at: now })
        .eq('id', entryId)
        .eq('agency_id', agencyId);

      if (calErr) throw calErr;

      // Propagate: variant → published
      if (variantId) {
        await supabase
          .from('social_post_variants')
          .update({ status: 'published' })
          .eq('id', variantId)
          .eq('agency_id', agencyId);
      }

      return { monthKey };
    },
    onSuccess: ({ monthKey }) => {
      queryClient.invalidateQueries({ queryKey: ['social-calendar', agencyId, monthKey] });
      queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
      toast.success('Marqué comme publié');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ─── Reschedule ──────────────────────────────────────────────
export function useRescheduleEntry() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, newDate, monthKey }: {
      entryId: string;
      newDate: string;
      monthKey: string;
    }) => {
      const { error } = await supabase
        .from('social_calendar_entries')
        .update({ scheduled_for: newDate })
        .eq('id', entryId)
        .eq('agency_id', agencyId);

      if (error) throw error;
      return { monthKey };
    },
    onSuccess: ({ monthKey }) => {
      queryClient.invalidateQueries({ queryKey: ['social-calendar', agencyId, monthKey] });
    },
  });
}
