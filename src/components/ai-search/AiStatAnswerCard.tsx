/**
 * Carte de réponse pour les statistiques
 * Affichage riche des résultats StatIA
 */

import React from 'react';
import { TrendingUp, Calendar, Filter, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingItem {
  rank: number;
  id: string | number;
  name: string;
  value: number;
}

interface StatResult {
  value: number | string;
  unit?: string;
  ranking?: RankingItem[];
  topItem?: RankingItem;
  evolution?: {
    previous: number;
    change: number;
    changePercent: number;
  };
}

interface AiStatAnswerCardProps {
  metricId: string;
  metricLabel: string;
  period: { start: string; end: string; label: string };
  dimension: string;
  filters?: Record<string, unknown>;
  result: StatResult;
  agencyName?: string;
}

function formatValue(value: number | string, unit?: string): string {
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
  
  if (unit === 'jours' || unit === 'days') {
    return `${value.toFixed(1)} jours`;
  }
  
  return new Intl.NumberFormat('fr-FR').format(value);
}

export const AiStatAnswerCard: React.FC<AiStatAnswerCardProps> = ({
  metricId,
  metricLabel,
  period,
  dimension,
  filters,
  result,
  agencyName,
}) => {
  const hasRanking = result.ranking && result.ranking.length > 0;
  const hasEvolution = result.evolution && result.evolution.changePercent !== 0;
  
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{metricLabel}</h3>
            {agencyName && (
              <p className="text-xs text-slate-400">{agencyName}</p>
            )}
          </div>
        </div>
        
        {hasEvolution && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            result.evolution!.changePercent > 0 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          )}>
            {result.evolution!.changePercent > 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>{Math.abs(result.evolution!.changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {/* Valeur principale */}
      {!hasRanking && (
        <div className="py-4">
          <p className="text-3xl font-bold text-white">
            {formatValue(result.value, result.unit)}
          </p>
          {hasEvolution && (
            <p className="text-sm text-slate-400 mt-1">
              vs {formatValue(result.evolution!.previous, result.unit)} précédemment
            </p>
          )}
        </div>
      )}
      
      {/* Classement */}
      {hasRanking && (
        <div className="space-y-2">
          {result.ranking!.slice(0, 5).map((item, index) => (
            <div 
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg',
                index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800/50'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                index === 0 ? 'bg-yellow-500 text-yellow-950' :
                index === 1 ? 'bg-slate-400 text-slate-900' :
                index === 2 ? 'bg-amber-700 text-amber-100' :
                'bg-slate-700 text-slate-300'
              )}>
                {item.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{item.name}</p>
              </div>
              <p className="text-sm font-semibold text-emerald-400">
                {formatValue(item.value, result.unit)}
              </p>
            </div>
          ))}
        </div>
      )}
      
      {/* Top unique */}
      {result.topItem && !hasRanking && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <Award className="w-5 h-5 text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">{result.topItem.name}</p>
            <p className="text-xs text-slate-400">Meilleur résultat</p>
          </div>
          <p className="text-sm font-semibold text-yellow-400">
            {formatValue(result.topItem.value, result.unit)}
          </p>
        </div>
      )}
      
      {/* Métadonnées */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{period.label}</span>
        </div>
        
        {dimension !== 'global' && (
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span className="capitalize">{dimension}</span>
          </div>
        )}
        
        {filters?.univers && (
          <div className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
            {String(filters.univers)}
          </div>
        )}
      </div>
    </div>
  );
};
