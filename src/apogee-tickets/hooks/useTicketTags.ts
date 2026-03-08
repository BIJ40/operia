/**
 * Hook pour gérer les tags de tickets persistants
 * Les tags créés par les utilisateurs sont stockés en base et disponibles pour tous
 * Optimistic UI: création de tag instantanée côté cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logError } from '@/lib/logger';

export interface TicketTag {
  id: string;
  label: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

const TAG_COLORS: Record<string, string> = {
  BUG: 'red',
  EVO: 'blue',
  NTH: 'gray',
};

/** Tags legacy à ignorer (préfixe impact_) */
export const isLegacyImpactTag = (tag: string) =>
  /^impact_/i.test(tag);

const COLOR_CLASSES: Record<string, string> = {
  red: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/40 dark:text-gray-300',
  purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
};

export function useTicketTags() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['apogee-ticket-tags'],
    queryFn: async (): Promise<TicketTag[]> => {
      const { data, error } = await supabase
        .from('apogee_ticket_tags')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        logError('[TICKET-TAGS] Error fetching tags', error);
        return [];
      }
      return ((data || []) as TicketTag[]).filter(t => !isLegacyImpactTag(t.id));
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const upperTag = tagName.toUpperCase().trim();
      const color = TAG_COLORS[upperTag] || 'purple';

      const { data, error } = await supabase
        .from('apogee_ticket_tags')
        .insert({
          id: upperTag,
          label: upperTag,
          color,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return null; // duplicate
        logError('[TICKET-TAGS] Error creating tag', error);
        throw error;
      }
      return data;
    },
    // Optimistic: add tag to cache immediately
    onMutate: async (tagName: string) => {
      const upperTag = tagName.toUpperCase().trim();
      await queryClient.cancelQueries({ queryKey: ['apogee-ticket-tags'] });
      const previous = queryClient.getQueryData<TicketTag[]>(['apogee-ticket-tags']);

      const color = TAG_COLORS[upperTag] || 'purple';
      const optimisticTag: TicketTag = {
        id: upperTag,
        label: upperTag,
        color,
        created_at: new Date().toISOString(),
        created_by: user?.id || null,
      };

      queryClient.setQueryData<TicketTag[]>(['apogee-ticket-tags'], (old) => {
        if (!old) return [optimisticTag];
        if (old.some(t => t.id === upperTag)) return old;
        return [...old, optimisticTag];
      });

      return { previous };
    },
    onError: (_err, _tag, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['apogee-ticket-tags'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-tags'] });
    },
  });

  // Fire-and-forget: ensure tag exists
  const ensureTagExists = (tagName: string) => {
    const upperTag = tagName.toUpperCase().trim();
    const existing = tags.find(t => t.id === upperTag);
    if (!existing) {
      createTagMutation.mutate(upperTag);
    }
  };

  const getTagColor = (tagId: string): string => {
    const tag = tags.find(t => t.id === tagId);
    const colorKey = tag?.color || (TAG_COLORS[tagId] || 'purple');
    return COLOR_CLASSES[colorKey] || COLOR_CLASSES.purple;
  };

  return {
    tags,
    isLoading,
    ensureTagExists,
    getTagColor,
    createTag: createTagMutation.mutateAsync,
  };
}
