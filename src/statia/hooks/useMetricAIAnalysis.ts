import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MetricDimension {
  key: string;
  label: string;
  source?: string;
  field: string;
  labelField?: string;
  via?: string;
}

export interface MetricJoin {
  from: string;
  to: string;
  localField: string;
  remoteField: string;
  type?: 'inner' | 'left';
}

export interface MetricFormula {
  type: 'count' | 'sum' | 'avg' | 'ratio' | 'distinct_count' | 'min' | 'max';
  field?: string;
  groupBy?: string[];
  numerator?: { type: string; field?: string; source?: string; filters?: any[] };
  denominator?: { type: string; field?: string; source?: string; filters?: any[] };
  transform?: 'percent' | 'round' | 'abs';
  unit?: 'euros' | 'percent' | 'count' | 'hours' | 'minutes';
}

export interface MetricInputSources {
  primary: string;
  secondary?: string[];
  joins?: MetricJoin[];
}

export interface MetricOutputFormat {
  type: 'number' | 'table' | 'pivot' | 'timeseries';
  chart_type?: 'bar' | 'line' | 'pie' | 'heatmap' | 'treemap';
  columns?: string[];
  recommended?: boolean;
}

export interface MetricFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'contains' | 'exists';
  value: any;
}

export interface MetricAnalysisResult {
  understood: boolean;
  businessSummary: string;
  technicalSummary: string;
  metric: {
    id: string;
    label: string;
    scope: 'agency' | 'franchiseur';
    input_sources: MetricInputSources;
    formula: MetricFormula;
    filters: MetricFilter[];
    dimensions?: MetricDimension[];
    output_format?: MetricOutputFormat;
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
