/**
 * Carte pour les requêtes ambiguës avec plusieurs métriques candidates
 */

import React from 'react';
import { HelpCircle, ChevronRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCandidate {
  metricId: string;
  label: string;
  score?: number;
  reason?: string;
  description?: string;
}

interface AiAmbiguousAnswerCardProps {
  message: string;
  candidates: MetricCandidate[];
  originalQuery: string;
  onSelectMetric: (metricId: string) => void;
}

export const AiAmbiguousAnswerCard: React.FC<AiAmbiguousAnswerCardProps> = ({
  message,
  candidates,
  originalQuery,
  onSelectMetric,
}) => {
  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Précision requise</h3>
          <p className="text-sm text-slate-300 mt-1">{message}</p>
        </div>
      </div>
      
      {/* Requête originale */}
      <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <p className="text-xs text-slate-400">Votre question :</p>
        <p className="text-sm text-slate-200 mt-0.5">"{originalQuery}"</p>
      </div>
      
      {/* Liste des candidats */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">
          Choisissez une métrique :
        </p>
        
        {candidates.map((candidate) => (
          <button
            key={candidate.metricId}
            onClick={() => onSelectMetric(candidate.metricId)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left',
              'bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-purple-500/50',
              'transition-all group'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 group-hover:text-white">
                {candidate.label}
              </p>
              {candidate.description && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {candidate.description}
                </p>
              )}
              {candidate.reason && (
                <p className="text-xs text-purple-400/70 mt-0.5">
                  {candidate.reason}
                </p>
              )}
            </div>
            
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};
