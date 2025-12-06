/**
 * Carte Debug - affichée uniquement pour les N6 (superadmin)
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebugCardProps {
  debug: {
    keywordScore?: number;
    detectedCategories?: string[];
    strongCategoriesCount?: number;
    metricId?: string;
    queryType?: string;
    llmLatency?: number;
    cacheHit?: boolean;
    corrections?: Array<{ field: string; from: string; to: string; reason: string }>;
    rawLLM?: unknown;
    [key: string]: unknown;
  };
}

export const DebugCard: React.FC<DebugCardProps> = ({ debug }) => {
  const [expanded, setExpanded] = useState(false);

  const {
    keywordScore,
    detectedCategories,
    strongCategoriesCount,
    metricId,
    queryType,
    llmLatency,
    cacheHit,
    corrections,
    ...rest
  } = debug;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 text-xs text-amber-50 overflow-hidden">
      {/* Header cliquable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-amber-200">Debug (N6)</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-400" />
        )}
      </button>

      {/* Contenu */}
      <div
        className={cn(
          'px-4 pb-3 space-y-3 transition-all duration-200',
          expanded ? 'block' : 'hidden'
        )}
      >
        {/* Métriques rapides */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="bg-amber-900/30 rounded p-2">
            <div className="text-amber-400/70 text-[10px]">Score Mots-clés</div>
            <div className="font-mono font-bold text-amber-200">{keywordScore ?? '—'}</div>
          </div>
          <div className="bg-amber-900/30 rounded p-2">
            <div className="text-amber-400/70 text-[10px]">Catégories Fortes</div>
            <div className="font-mono font-bold text-amber-200">{strongCategoriesCount ?? '—'}</div>
          </div>
          <div className="bg-amber-900/30 rounded p-2">
            <div className="text-amber-400/70 text-[10px]">Latence LLM</div>
            <div className="font-mono font-bold text-amber-200">
              {llmLatency ? `${llmLatency}ms` : '—'}
            </div>
          </div>
        </div>

        {/* Type & Métrique */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-amber-400/70 text-[10px] mb-1">Type Requête</div>
            <div className="font-mono bg-amber-900/30 rounded px-2 py-1 text-amber-100">
              {queryType ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-amber-400/70 text-[10px] mb-1">Metric ID</div>
            <div className="font-mono bg-amber-900/30 rounded px-2 py-1 text-amber-100">
              {metricId ?? '—'}
            </div>
          </div>
        </div>

        {/* Cache */}
        {cacheHit !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400/70">Cache:</span>
            <span className={cn(
              'font-mono px-2 py-0.5 rounded',
              cacheHit ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'
            )}>
              {cacheHit ? 'HIT' : 'MISS'}
            </span>
          </div>
        )}

        {/* Catégories détectées */}
        {detectedCategories && detectedCategories.length > 0 && (
          <div>
            <div className="text-amber-400/70 text-[10px] mb-1">Catégories Détectées</div>
            <div className="flex flex-wrap gap-1">
              {detectedCategories.map((cat) => (
                <span 
                  key={cat} 
                  className="px-1.5 py-0.5 rounded bg-amber-800/40 text-amber-200 text-[10px]"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Corrections */}
        {corrections && corrections.length > 0 && (
          <div>
            <div className="text-amber-400/70 text-[10px] mb-1">Corrections Appliquées</div>
            <div className="space-y-1">
              {corrections.map((c, i) => (
                <div key={i} className="bg-amber-900/30 rounded p-1.5 text-[10px]">
                  <span className="text-amber-300">{c.field}:</span>{' '}
                  <span className="text-red-300 line-through">{c.from}</span>{' '}
                  <span className="text-amber-400">→</span>{' '}
                  <span className="text-green-300">{c.to}</span>
                  <span className="text-amber-500 ml-2">({c.reason})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JSON brut */}
        {Object.keys(rest).length > 0 && (
          <div>
            <div className="text-amber-400/70 text-[10px] mb-1">Données brutes</div>
            <pre className="whitespace-pre-wrap text-[10px] bg-amber-900/30 rounded p-2 max-h-40 overflow-auto text-amber-100">
              {JSON.stringify(rest, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
