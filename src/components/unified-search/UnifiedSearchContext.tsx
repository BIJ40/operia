/**
 * Contexte React pour la recherche unifiée
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UnifiedSearchResult, UnifiedSearchState } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UnifiedSearchContextValue extends UnifiedSearchState {
  openSearch: () => void;
  closeSearch: () => void;
  submitQuery: (query: string) => Promise<void>;
  clearResult: () => void;
}

const UnifiedSearchContext = createContext<UnifiedSearchContextValue | null>(null);

export function useUnifiedSearch() {
  const context = useContext(UnifiedSearchContext);
  if (!context) {
    throw new Error('useUnifiedSearch must be used within UnifiedSearchProvider');
  }
  return context;
}

interface UnifiedSearchProviderProps {
  children: ReactNode;
}

export function UnifiedSearchProvider({ children }: UnifiedSearchProviderProps) {
  const [state, setState] = useState<UnifiedSearchState>({
    isOpen: false,
    isLoading: false,
    query: '',
    result: null,
    error: null,
  });

  const openSearch = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true, error: null }));
  }, []);

  const closeSearch = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isOpen: false, 
      query: '', 
      result: null, 
      error: null 
    }));
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({ ...prev, result: null, error: null }));
  }, []);

  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setState(prev => ({ 
      ...prev, 
      query, 
      isLoading: true, 
      error: null,
      result: null 
    }));

    try {
      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: { query },
      });

      if (error) {
        console.error('Unified search error:', error);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Erreur lors de la recherche. Veuillez réessayer.' 
        }));
        toast.error('Erreur lors de la recherche');
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        result: data as UnifiedSearchResult,
        isOpen: false, // Fermer la barre d'input
      }));

    } catch (err) {
      console.error('Unified search exception:', err);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Erreur inattendue. Veuillez réessayer.' 
      }));
      toast.error('Erreur inattendue');
    }
  }, []);

  const value: UnifiedSearchContextValue = {
    ...state,
    openSearch,
    closeSearch,
    submitQuery,
    clearResult,
  };

  return (
    <UnifiedSearchContext.Provider value={value}>
      {children}
    </UnifiedSearchContext.Provider>
  );
}
