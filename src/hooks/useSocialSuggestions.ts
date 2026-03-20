/**
 * useSocialSuggestions — CRUD hook for social_content_suggestions + variants.
 * 
 * Conventions :
 * - suggestion = validation éditoriale (draft → approved → rejected → archived)
 * - variant = statut plateforme (draft → approved → scheduled → published → archived)
 * - suggestion rejected → variants archived automatically
 * - variant non publiable si suggestion non approved
 */

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
export function useSocialSuggestions(monthKey: string) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['social-suggestions', agencyId, monthKey],
    enabled: !!agencyId && !!monthKey,
    staleTime: 60_000,
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
      if (!suggestions?.length) return [];

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
export function useGenerateSuggestions() {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, year, regenerateSingle, suggestionId, prompt, targetDates }: {
      month: number;
      year: number;
      regenerateSingle?: boolean;
      suggestionId?: string;
      prompt?: { tone?: string; keywords?: string; audience?: string; length?: string; freePrompt?: string };
      targetDates?: string[];
    }) => {
      // Allow up to 5 minutes for AI generation (31 posts can be slow)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300_000);

      try {
        const { data, error } = await supabase.functions.invoke('social-suggest', {
          body: {
            agency_id: agencyId,
            month,
            year,
            regenerate_single: regenerateSingle || false,
            suggestion_id: suggestionId || null,
            prompt: prompt || null,
            target_dates: targetDates || null,
          },
        });
        clearTimeout(timeout);

        if (error) {
        let message = error.message || 'Erreur lors de la génération';
        try {
          const status = (error as any)?.context?.status;
          const body = await (error as any)?.context?.json?.();
          if (status === 429) {
            const retryAfter = body?.retryAfter;
            message = retryAfter
              ? `Trop de requêtes — réessayez dans ${Math.ceil(Number(retryAfter) / 60)} min.`
              : 'Trop de requêtes — réessayez dans quelques minutes.';
          } else if (status === 402) {
            message = 'Crédits IA insuffisants.';
          } else if (body?.error) {
            message = body.error;
          }
        } catch {
          // fallback on original error message
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const monthKey = data.month_key;
      queryClient.invalidateQueries({ queryKey: ['social-suggestions', agencyId, monthKey] });
      toast.success(`${data.generated_count} suggestions générées`);
    },
    onError: (err: any) => {
      const msg = err?.message || 'Erreur lors de la génération';
      toast.error(msg);
    },
  });
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
