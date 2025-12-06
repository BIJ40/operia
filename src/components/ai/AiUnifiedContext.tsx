/**
 * AI Unified Search 2026 - Context Provider
 * Single source of truth for all AI interactions
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  AiUnifiedState, 
  AiMessage, 
  AiMode, 
  StatResultData, 
  DocResultData,
  shouldGenerateChart,
  determineChartType,
  ChartData 
} from './types';

interface AiUnifiedContextValue extends AiUnifiedState {
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setMode: (mode: AiMode) => void;
  submitQuery: (query: string) => Promise<void>;
  clearMessages: () => void;
  closeResult: () => void;
}

const AiUnifiedContext = createContext<AiUnifiedContextValue | null>(null);

export function useAiUnified() {
  const context = useContext(AiUnifiedContext);
  if (!context) {
    throw new Error('useAiUnified must be used within AiUnifiedProvider');
  }
  return context;
}

interface AiUnifiedProviderProps {
  children: ReactNode;
}

export function AiUnifiedProvider({ children }: AiUnifiedProviderProps) {
  const [state, setState] = useState<AiUnifiedState>({
    isExpanded: false,
    mode: 'search',
    isLoading: false,
    messages: [],
    error: null,
  });

  const expand = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: true, error: null }));
  }, []);

  const collapse = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: false }));
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  const setMode = useCallback((mode: AiMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [], error: null }));
  }, []);

  const closeResult = useCallback(() => {
    // In chat mode, keep messages but collapse
    // In search mode, clear the last result
    setState(prev => {
      if (prev.mode === 'chat') {
        return { ...prev, isExpanded: false };
      }
      return { ...prev, messages: [], isExpanded: false };
    });
  }, []);

  const submitQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const userMessage: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date(),
      type: 'text',
    };

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      messages: [...prev.messages, userMessage],
    }));

    try {
      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: { query },
      });

      if (error) {
        console.error('AI search error:', error);
        const errorMessage: AiMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
          timestamp: new Date(),
          type: 'error',
        };
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Erreur lors de la recherche',
          messages: [...prev.messages, errorMessage],
        }));
        return;
      }

      // Transform response to assistant message
      const assistantMessage = transformToMessage(query, data);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        messages: [...prev.messages, assistantMessage],
        isExpanded: true,
      }));

    } catch (err) {
      console.error('AI search exception:', err);
      toast.error('Erreur inattendue');
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur inattendue',
      }));
    }
  }, []);

  const value: AiUnifiedContextValue = {
    ...state,
    expand,
    collapse,
    toggle,
    setMode,
    submitQuery,
    clearMessages,
    closeResult,
  };

  return (
    <AiUnifiedContext.Provider value={value}>
      {children}
    </AiUnifiedContext.Provider>
  );
}

// Transform edge function response to AiMessage
function transformToMessage(query: string, data: any): AiMessage {
  if (!data) {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Aucun résultat trouvé pour votre recherche.',
      timestamp: new Date(),
      type: 'text',
    };
  }

  // Handle error responses
  if (data.type === 'error' || data.type === 'access_denied') {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.error?.message || 'Erreur lors de la recherche.',
      timestamp: new Date(),
      type: 'error',
    };
  }

  // Handle ambiguous responses
  if (data.type === 'ambiguous') {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.result?.message || 'Pouvez-vous préciser votre question ?',
      timestamp: new Date(),
      type: 'text',
    };
  }

  // Handle stat responses
  if (data.type === 'stat') {
    const result = data.result || {};
    const interpretation = data.interpretation || {};
    
    const statData: StatResultData = {
      metricId: result.metricId || interpretation.metricId || '',
      metricLabel: result.label || interpretation.metricLabel || 'Statistique',
      value: result.value ?? 0,
      unit: result.unit,
      period: {
        from: result.period?.from || interpretation.period?.from || '',
        to: result.period?.to || interpretation.period?.to || '',
        label: result.period?.label || interpretation.period?.label || '',
        isDefault: result.period?.isDefault ?? interpretation.period?.isDefault ?? false,
      },
      filters: result.filters || interpretation.filters || {},
      ranking: result.ranking,
      topItem: result.topItem,
      evolution: result.evolution,
      agencyName: data.agencyName,
    };

    // Generate conversational response
    const conversationalText = generateConversationalResponse(statData);
    
    // Determine if chart should be auto-generated
    const needsChart = shouldGenerateChart(query, statData);
    let chartData: ChartData | null = null;
    
    if (needsChart) {
      chartData = {
        type: determineChartType(statData),
        title: statData.metricLabel,
        data: statData.ranking?.map(r => ({ name: r.name, value: r.value })) || 
              statData.evolution?.map(e => ({ name: e.label || e.date, value: e.value })) || [],
        unit: statData.unit,
      };
    }

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: conversationalText,
      timestamp: new Date(),
      type: needsChart ? 'chart' : 'stat',
      data: needsChart ? { ...statData, chart: chartData } : statData,
    };
  }

  // Handle doc responses
  if (data.type === 'doc') {
    // unified-search returns: { answer, sources, docResults, isConversational }
    const docResults = data.result?.docResults || data.result?.results || data.result?.sources || [];
    const answer = data.result?.answer || '';
    const docData: DocResultData = {
      results: Array.isArray(docResults) ? docResults : [],
      answer,
    };

    // Use the AI-generated answer if available, fallback to summary
    const content = answer 
      ? answer 
      : docData.results.length > 0
        ? `J'ai trouvé ${docData.results.length} document(s) pertinent(s) pour votre recherche.`
        : 'Aucun document trouvé.';

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      type: 'doc',
      data: docData,
    };
  }

  // Handle action responses
  if (data.type === 'action') {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Action détectée. Je vous redirige...',
      timestamp: new Date(),
      type: 'action',
    };
  }

  // Fallback
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: 'Je n\'ai pas compris votre demande. Essayez de reformuler.',
    timestamp: new Date(),
    type: 'text',
  };
}

// Generate natural language response for stats
function generateConversationalResponse(data: StatResultData): string {
  const { metricLabel, value, unit, period, topItem, ranking, agencyName } = data;
  
  const formattedValue = formatStatValue(value, unit);
  const periodText = period.label || 'la période sélectionnée';
  const agencyText = agencyName ? ` pour ${agencyName}` : '';
  
  // Top item response
  if (topItem) {
    return `Le meilleur résultat${agencyText} sur ${periodText} est **${topItem.name}** avec ${formatStatValue(topItem.value, unit)}.`;
  }
  
  // Ranking response
  if (ranking && ranking.length > 0) {
    const top3 = ranking.slice(0, 3);
    const rankingText = top3.map((r, i) => `${i + 1}. ${r.name} (${formatStatValue(r.value, unit)})`).join(', ');
    return `Voici le classement ${metricLabel.toLowerCase()}${agencyText} sur ${periodText} :\n${rankingText}${ranking.length > 3 ? ` et ${ranking.length - 3} autres...` : ''}`;
  }
  
  // Simple value response
  return `Votre ${metricLabel.toLowerCase()}${agencyText} sur ${periodText} est de **${formattedValue}**.`;
}

function formatStatValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') return value;
  
  if (unit === '€' || unit === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  return new Intl.NumberFormat('fr-FR').format(value);
}
