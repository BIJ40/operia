/**
 * Hook pour la recherche full-text de documents (P2-02)
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollaboratorDocument } from '@/types/collaboratorDocument';

export function useDocumentSearch(collaboratorId: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Search documents using RPC
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ['document-search', collaboratorId, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .rpc('search_collaborator_documents', {
          p_collaborator_id: collaboratorId,
          p_search_query: searchQuery.trim(),
        });

      if (error) throw error;
      return data as CollaboratorDocument[];
    },
    enabled: !!collaboratorId && searchQuery.trim().length >= 2,
    staleTime: 30000, // 30 seconds
  });

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // Start searching
  const startSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  // Cancel search
  const cancelSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchLoading,
    isSearching,
    startSearch,
    cancelSearch,
    clearSearch,
    hasResults: searchResults.length > 0,
  };
}
