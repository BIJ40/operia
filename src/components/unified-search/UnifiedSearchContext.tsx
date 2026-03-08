/**
 * Contexte React pour la recherche unifiée
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UnifiedSearchResult, UnifiedSearchState } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
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

      // Transform edge function response to frontend format
      const transformedResult = transformEdgeResponse(data);

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        result: transformedResult,
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

  // Transform edge function response to match frontend types
  function transformEdgeResponse(data: any): UnifiedSearchResult | null {
    if (!data) return null;

    // Handle error responses
    if (data.type === 'error' || data.type === 'access_denied') {
      return {
        type: 'fallback',
        message: data.error?.message || 'Erreur lors de la recherche.',
      };
    }

    // Handle ambiguous responses
    if (data.type === 'ambiguous') {
      return {
        type: 'fallback',
        message: data.result?.message || 'Requête ambiguë. Veuillez préciser votre question.',
      };
    }

    // Handle stat responses
    if (data.type === 'stat') {
      const edgeResult = data.result || {};
      const interpretation = data.interpretation || {};
      
      return {
        type: 'stat',
        metricId: edgeResult.metricId || interpretation.metricId || '',
        metricLabel: edgeResult.label || interpretation.metricLabel || '',
        filters: {
          univers: edgeResult.filters?.univers,
          periode: edgeResult.period ? {
            start: edgeResult.period.from,
            end: edgeResult.period.to,
            label: edgeResult.period.label,
            isDefault: edgeResult.period.isDefault ?? interpretation.period?.isDefault ?? false,
          } : undefined,
          technicien: edgeResult.filters?.technicien,
        },
        result: {
          value: edgeResult.value ?? 0,
          topItem: edgeResult.topItem,
          ranking: edgeResult.ranking,
          unit: edgeResult.unit,
        },
        agencySlug: data.agencySlug || '',
        agencyName: data.agencyName,
        computedAt: data.computedAt || new Date().toISOString(),
        parsed: {
          metricId: interpretation.metricId || edgeResult.metricId,
          metricLabel: interpretation.metricLabel || edgeResult.label,
          dimension: interpretation.dimension || 'global',
          intentType: interpretation.intentType || 'valeur',
          univers: interpretation.filters?.univers,
          period: interpretation.period ? {
            start: interpretation.period.from,
            end: interpretation.period.to,
            label: interpretation.period.label,
            isDefault: interpretation.period.isDefault ?? edgeResult.period?.isDefault ?? false,
          } : undefined,
          confidence: interpretation.confidence ?? 0.5,
          minRole: 2,
          isRanking: !!edgeResult.ranking,
          debug: {
            detectedDimension: interpretation.dimension || 'global',
            detectedIntent: interpretation.intentType || 'valeur',
            detectedUnivers: interpretation.filters?.univers || null,
            detectedPeriod: interpretation.period?.label || null,
            routingPath: interpretation.corrections?.join(' → ') || 'direct',
          },
        },
        accessDenied: false,
      };
    }

    // Handle doc responses
    if (data.type === 'doc') {
      const docResults = data.result?.results || data.result || [];
      return {
        type: 'doc',
        results: Array.isArray(docResults) ? docResults : [],
      };
    }

    // Handle action responses
    if (data.type === 'action') {
      return {
        type: 'fallback',
        message: 'Action détectée. Redirection en cours...',
      };
    }

    // Fallback
    return {
      type: 'fallback',
      message: 'Aucun résultat trouvé.',
    };
  }

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
