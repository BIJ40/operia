/**
 * AI Unified Search 2026 - Types
 */

export type AiMode = 'search' | 'chat';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'stat' | 'doc' | 'chart' | 'error' | 'action';
  data?: StatResultData | DocResultData | ChartData | null;
}

export interface StatResultData {
  metricId: string;
  metricLabel: string;
  value: number | string;
  unit?: string;
  period: { from: string; to: string; label: string; isDefault?: boolean };
  filters?: Record<string, unknown>;
  ranking?: Array<{ rank: number; id: string | number; name: string; value: number }>;
  topItem?: { id: string | number; name: string; value: number };
  evolution?: Array<{ date: string; value: number; label?: string }>;
  agencyName?: string;
  chart?: ChartData | null;
}

export interface DocResultData {
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    url: string;
    source: string;
    similarity?: number;
  }>;
  answer?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'ranking';
  title: string;
  data: Array<{ name: string; value: number; [key: string]: any }>;
  xKey?: string;
  yKey?: string;
  unit?: string;
}

export interface AiUnifiedState {
  isExpanded: boolean;
  mode: AiMode;
  isLoading: boolean;
  messages: AiMessage[];
  error: string | null;
}

// Detection helpers for auto-chart generation
export function shouldGenerateChart(query: string, result: StatResultData | null): boolean {
  if (!result) return false;
  
  const chartTriggers = [
    'evolution', 'évolution', 'tendance', 'progression', 'historique',
    'sur l\'année', 'sur l\'annee', 'mensuel', 'par mois', 'comparatif',
    'graphique', 'courbe', 'chart'
  ];
  
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasTrigger = chartTriggers.some(t => normalizedQuery.includes(t));
  
  // Auto-generate chart for rankings > 3 items
  const hasLargeRanking = result.ranking && result.ranking.length > 3;
  
  // Auto-generate chart for evolution data
  const hasEvolution = result.evolution && result.evolution.length > 1;
  
  return hasTrigger || hasLargeRanking || hasEvolution;
}

export function determineChartType(result: StatResultData): ChartData['type'] {
  if (result.evolution && result.evolution.length > 0) return 'line';
  if (result.ranking && result.ranking.length > 0) return 'bar';
  return 'bar';
}
