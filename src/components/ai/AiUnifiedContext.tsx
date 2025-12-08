/**
 * AI Unified Search 2026 - Context Provider (Documentation only)
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AiUnifiedState, AiMessage, AiMode, DocResultData } from './types';

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

    const currentMessages = state.messages;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      messages: [...prev.messages, userMessage],
    }));

    try {
      const conversationHistory = currentMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('unified-search', {
        body: { 
          query,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        },
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

      const assistantMessage = transformToMessage(data);
      
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
  }, [state.messages]);

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

// Transform edge function response to AiMessage (Documentation only)
function transformToMessage(data: any): AiMessage {
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

  // Handle doc responses
  if (data.type === 'doc') {
    const docResults = data.result?.docResults || data.result?.results || data.result?.sources || [];
    const answer = data.result?.answer || '';
    const docData: DocResultData = {
      results: Array.isArray(docResults) ? docResults : [],
      answer,
    };

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
    content: data.result?.answer || 'Je n\'ai pas compris votre demande. Essayez de reformuler.',
    timestamp: new Date(),
    type: 'text',
  };
}
