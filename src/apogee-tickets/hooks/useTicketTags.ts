/**
 * Hook pour gérer les tags de tickets persistants
 * Les tags créés par les utilisateurs sont stockés en base et disponibles pour tous
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export function useTicketTags() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all tags from database
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
      return (data || []) as TicketTag[];
    },
  });

  // Create a new tag if it doesn't exist
  const createTagMutation = useMutation({
    mutationFn: async (tagName: string) => {
      const upperTag = tagName.toUpperCase().trim();
      
      // Check if tag already exists
      const existing = tags.find(t => t.id === upperTag);
      if (existing) {
        return existing;
      }

      // Determine color - purple for custom tags
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
        // If duplicate key error, just return (tag was created by someone else)
        if (error.code === '23505') {
          return null;
        }
        logError('[TICKET-TAGS] Error creating tag', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-tags'] });
    },
  });

  // Ensure tag exists in database when user adds it
  const ensureTagExists = async (tagName: string) => {
    const upperTag = tagName.toUpperCase().trim();
    const existing = tags.find(t => t.id === upperTag);
    if (!existing) {
      await createTagMutation.mutateAsync(upperTag);
    }
  };

  // Get color for a tag
  const getTagColor = (tagId: string): string => {
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      switch (tag.color) {
        case 'red': return 'bg-red-100 text-red-800 hover:bg-red-200';
        case 'blue': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
        case 'gray': return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
        case 'purple': return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
        default: return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      }
    }
    return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
  };

  return {
    tags,
    isLoading,
    ensureTagExists,
    getTagColor,
    createTag: createTagMutation.mutateAsync,
  };
}
