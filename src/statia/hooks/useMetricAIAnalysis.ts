import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetricAnalysisResult {
  understood: boolean;
  businessSummary: string;
  technicalSummary: string;
  metric: {
    id: string;
    label: string;
    scope: 'agency' | 'franchiseur';
    input_sources: {
      primary: string;
      joins?: string[];
    };
    formula: {
      type: 'count' | 'sum' | 'avg' | 'ratio';
      field?: string;
      groupBy?: string[];
    };
    filters: Array<{
      field: string;
      operator: 'eq' | 'in' | 'between' | 'gt' | 'lt';
      value: string | string[];
    }>;
    description_agence?: string;
    description_franchiseur?: string;
  } | null;
  confidence: number;
  suggestions: string[];
}

export function useMetricAIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<MetricAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeQuery = async (query: string): Promise<MetricAnalysisResult | null> => {
    if (!query.trim()) {
      toast.error('Veuillez saisir une description de la métrique');
      return null;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('statia-analyze-metric', {
        body: { query }
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      return data;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'analyse';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    analyzeQuery,
    isAnalyzing,
    result,
    error,
    reset
  };
}
