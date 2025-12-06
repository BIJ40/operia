/**
 * Carte d'interprétation IA - affiche la métrique, période, filtres validés
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Calendar, Filter, Sparkles } from 'lucide-react';

interface InterpretationCardProps {
  interpretation: {
    metricId?: string;
    metricLabel?: string;
    period?: {
      from?: string | null;
      to?: string | null;
      label?: string;
    };
    score?: number;
    keywordScore?: number;
    validated?: boolean;
    intentType?: string;
    univers?: string | null;
    apporteur?: string | null;
    technicien?: string | null;
    networkScope?: boolean;
    isForecast?: boolean;
    advancedAnalytics?: boolean;
    categories?: string[];
    confidence?: string;
    fromCache?: boolean;
  };
}

export const InterpretationCard: React.FC<InterpretationCardProps> = ({ interpretation }) => {
  const { 
    metricId, 
    metricLabel,
    period, 
    keywordScore,
    validated,
    intentType,
    univers,
    apporteur,
    technicien,
    networkScope,
    isForecast,
    advancedAnalytics,
    categories,
    confidence,
    fromCache
  } = interpretation;

  const periodLabel = period?.label ?? 
    (period?.from && period?.to ? `${period.from} → ${period.to}` : null);

  const hasFilters = univers || apporteur || technicien;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-emerald-50">Interprétation IA</span>
        </div>
        <div className="flex items-center gap-2">
          {validated && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-300 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Validée
            </Badge>
          )}
          {fromCache && (
            <Badge variant="outline" className="border-sky-500/50 text-sky-300 text-xs">
              Cache
            </Badge>
          )}
        </div>
      </div>

      {/* Métrique */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-emerald-400/70 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Métrique
          </span>
          <div className="font-mono text-emerald-50 bg-emerald-900/30 rounded px-2 py-1">
            {metricLabel || metricId || '—'}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-emerald-400/70 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Période
          </span>
          <div className="font-mono text-emerald-50 bg-emerald-900/30 rounded px-2 py-1">
            {periodLabel || '—'}
          </div>
        </div>
      </div>

      {/* Filtres */}
      {hasFilters && (
        <div className="space-y-1">
          <span className="text-emerald-400/70 font-medium text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtres
          </span>
          <div className="flex flex-wrap gap-1.5">
            {univers && (
              <Badge variant="secondary" className="text-xs bg-emerald-800/40 text-emerald-200">
                Univers: {univers}
              </Badge>
            )}
            {apporteur && (
              <Badge variant="secondary" className="text-xs bg-emerald-800/40 text-emerald-200">
                Apporteur: {apporteur}
              </Badge>
            )}
            {technicien && (
              <Badge variant="secondary" className="text-xs bg-emerald-800/40 text-emerald-200">
                Technicien: {technicien}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Flags & Score */}
      <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
        <div className="flex gap-1.5">
          {intentType && (
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-300">
              {intentType}
            </Badge>
          )}
          {networkScope && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
              Réseau
            </Badge>
          )}
          {isForecast && (
            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300">
              Prévision
            </Badge>
          )}
          {advancedAnalytics && (
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-300">
              Analytics
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400/70">
          {keywordScore !== undefined && (
            <span>Score: <span className="font-mono text-emerald-300">{keywordScore}</span></span>
          )}
          {confidence && (
            <span>Confiance: <span className="font-mono text-emerald-300">{confidence}</span></span>
          )}
        </div>
      </div>

      {/* Catégories détectées */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {categories.slice(0, 6).map((cat) => (
            <span 
              key={cat} 
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800/30 text-emerald-400/80"
            >
              {cat}
            </span>
          ))}
          {categories.length > 6 && (
            <span className="text-[10px] text-emerald-400/50">+{categories.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
};
