/**
 * useSocialSuggestions — CRUD hook for social_content_suggestions + variants.
 * 
 * Conventions :
 * - suggestion = validation éditoriale (draft → approved → rejected → archived)
 * - variant = statut plateforme (draft → approved → scheduled → published → archived)
 * - suggestion rejected → variants archived automatically
 * - variant non publiable si suggestion non approved
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SocialSuggestion {
  id: string;
  agency_id: string;
  month_key: string;
  suggestion_date: string;
  title: string;
  content_angle: string | null;
  caption_base_fr: string;
  hashtags: string[];
  platform_targets: any;
  visual_type: string;
  topic_type: string;
  topic_key: string | null;
  realisation_id: string | null;
  universe: string | null;
  relevance_score: number | null;
  status: string;
  source_type: string;
  is_user_edited: boolean;
  generation_batch_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  variants?: SocialVariant[];
}

export interface SocialVariant {
  id: string;
  suggestion_id: string;
  agency_id: string;
  platform: string;
  caption_fr: string;
  cta: string | null;
  hashtags: string[];
  format: string | null;
  recommended_dimensions: string | null;
  platform_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// ─── Fetch suggestions for a month ───────────────────────────
export function useSocialSuggestions(
  monthKey: string,
  pollingEnabled = false,
  onPollResult?: (count: number) => void,
) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['social-suggestions', agencyId, monthKey],
    enabled: !!agencyId && !!monthKey,
    staleTime: pollingEnabled ? 0 : 60_000,
    refetchInterval: pollingEnabled ? 3_000 : false,
    queryFn: async (): Promise<SocialSuggestion[]> => {
      if (!agencyId) return [];

      const { data: suggestions, error } = await supabase
        .from('social_content_suggestions')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('month_key', monthKey)
        .neq('status', 'archived')
        .order('suggestion_date', { ascending: true });

      if (error) throw error;
      if (!suggestions?.length) {
        onPollResult?.(0);
        return [];
      }

      // Notify polling observer
      onPollResult?.(suggestions.length);

      // Fetch variants for all suggestions
      const suggestionIds = suggestions.map(s => s.id);
      const { data: variants } = await supabase
        .from('social_post_variants')
        .select('*')
        .in('suggestion_id', suggestionIds)
        .neq('status', 'archived');

      // Group variants by suggestion
      const variantMap = new Map<string, SocialVariant[]>();
      for (const v of variants || []) {
        const list = variantMap.get(v.suggestion_id) || [];
        list.push(v as SocialVariant);
        variantMap.set(v.suggestion_id, list);
      }

      return suggestions.map(s => ({
        ...s,
        variants: variantMap.get(s.id) || [],
      })) as SocialSuggestion[];
    },
  });
}

// ─── Generate suggestions (invoke edge function) ─────────────
// Fire-and-forget: starts the edge function, then polling detects completion.
export function useGenerateSuggestions() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const prevCountRef = { current: -1 };
  const stableCountRef = { current: 0 };
  const expectedMinRef = { current: 0 };

  // Call this from the polling query to auto-detect completion
  const checkGenerationDone = useCallback((currentCount: number) => {
    if (!isGenerating) return;
    // Wait for at least a few suggestions before checking stability
    if (currentCount < expectedMinRef.current && currentCount < 5) {
      prevCountRef.current = currentCount;
      stableCountRef.current = 0;
      return;
    }
    if (currentCount === prevCountRef.current && currentCount > 0) {
      stableCountRef.current += 1;
      // Stable for 3 consecutive polls (9s) → generation done
      if (stableCountRef.current >= 3) {
        setIsGenerating(false);
        stableCountRef.current = 0;
        prevCountRef.current = -1;
        toast.success(`${currentCount} suggestions générées`);
      }
    } else {
      stableCountRef.current = 0;
    }
    prevCountRef.current = currentCount;
  }, [isGenerating]);

  const mutation = useMutation({
    mutationFn: async ({ month, year, regenerateSingle, suggestionId, prompt, targetDates }: {
      month: number;
      year: number;
      regenerateSingle?: boolean;
      suggestionId?: string;
      prompt?: { tone?: string; keywords?: string; audience?: string; length?: string; freePrompt?: string };
      targetDates?: string[];
    }) => {
      // Reset polling detection
      prevCountRef.current = -1;
      stableCountRef.current = 0;
      expectedMinRef.current = regenerateSingle ? 1 : (targetDates?.length || 20);
      setIsGenerating(true);

      // Fire-and-forget: don't await the full response
      supabase.functions.invoke('social-suggest', {
        body: {
          agency_id: agencyId,
          month,
          year,
          regenerate_single: regenerateSingle || false,
          suggestion_id: suggestionId || null,
          prompt: prompt || null,
          target_dates: targetDates || null,
        },
      }).then(({ data, error }) => {
        if (error || data?.error) {
          console.error('[social-suggest] Edge function error:', error || data?.error);
          // If polling hasn't already stopped it, force stop
          if (isGenerating) {
            setIsGenerating(false);
            const msg = error?.message || data?.error || 'Erreur lors de la génération';
            toast.error(msg);
          }
        }
        // If polling already detected completion, this is a no-op
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
      }).catch(() => {
        // Network error — polling will handle the generated suggestions
        console.warn('[social-suggest] Network timeout — polling handles results');
      });

      // Return immediately so the mutation resolves fast
      return { month_key: `${year}-${String(month).padStart(2, '0')}` };
    },
  });

  return { ...mutation, isGenerating, checkGenerationDone };
}

// ─── Update suggestion status ────────────────────────────────
export function useUpdateSuggestionStatus() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, monthKey }: { id: string; status: string; monthKey: string }) => {
      // Update suggestion
      const { error } = await supabase
        .from('social_content_suggestions')
        .update({ status })
        .eq('id', id)
        .eq('agency_id', agencyId);

      if (error) throw error;

      // If rejected, archive all variants
      if (status === 'rejected') {
        await supabase
          .from('social_post_variants')
          .update({ status: 'archived' })
          .eq('suggestion_id', id)
          .eq('agency_id', agencyId);
      }

      // If approved → check if suggestion_date is today or past → send webhook immediately
      // If future date → webhook will be dispatched by daily cron job
      if (status === 'approved' && agencyId) {
        // Fetch the suggestion to get its date
        const { data: suggData } = await supabase
          .from('social_content_suggestions')
          .select('suggestion_date')
          .eq('id', id)
          .single();

        const suggestionDate = suggData?.suggestion_date;
        const today = new Date().toISOString().slice(0, 10);
        const isPastOrToday = !suggestionDate || suggestionDate <= today;

        if (isPastOrToday) {
          supabase.functions.invoke('dispatch-social-webhook', {
            body: { suggestion_id: id, agency_id: agencyId },
          }).then(({ error: whErr, data: whData }) => {
            if (whErr || whData?.error) {
              console.warn('[social-webhook] Dispatch PUBLI failed:', whErr?.message || whData?.error);
              toast.error('Post approuvé mais l\'envoi webhook a échoué');
            } else {
              toast.success('Post approuvé & envoyé (PUBLI)');
            }
          }).catch((err: any) => {
            console.warn('[social-webhook] Dispatch PUBLI error:', err);
          });
        } else {
          toast.success(`Post approuvé — publication programmée le ${new Date(suggestionDate).toLocaleDateString('fr-FR')}`);
        }
      }

      return { id, status, monthKey };
    },
    onSuccess: ({ status, monthKey }) => {
      queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
      if (status !== 'approved') {
        // For approved, the toast is handled by the webhook callback above
      }
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ─── Update suggestion text (marks as user-edited) ───────────
export function useUpdateSuggestionText() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, caption_base_fr, title, monthKey }: {
      id: string;
      caption_base_fr?: string;
      title?: string;
      monthKey: string;
    }) => {
      const updates: any = { is_user_edited: true };
      if (caption_base_fr !== undefined) updates.caption_base_fr = caption_base_fr;
      if (title !== undefined) updates.title = title;

      const { error } = await supabase
        .from('social_content_suggestions')
        .update(updates)
        .eq('id', id)
        .eq('agency_id', agencyId);

      if (error) throw error;
      return { monthKey };
    },
    onSuccess: ({ monthKey }) => {
      queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
    },
  });
}
