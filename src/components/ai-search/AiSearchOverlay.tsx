/**
 * Overlay plein écran pour la recherche IA
 * Modal avec interprétation + debug + cartes spécialisées
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, AlertCircle, TrendingUp, FileText, Zap } from 'lucide-react';
import { InterpretationCard } from './InterpretationCard';
import { DebugCard } from './DebugCard';
import { AiStatAnswerCard } from './AiStatAnswerCard';
import { AiDocAnswerCard } from './AiDocAnswerCard';
import { AiErrorAnswerCard } from './AiErrorAnswerCard';
import { AiAmbiguousAnswerCard } from './AiAmbiguousAnswerCard';
import { cn } from '@/lib/utils';

export interface AiSearchResult {
  type: 'stat' | 'doc' | 'action' | 'ambiguous' | 'fallback' | 'access_denied' | 'stats_query' | 'documentary_query' | 'action_query' | 'unknown';
  interpretation?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  debug?: Record<string, unknown>;
  accessDenied?: boolean;
  accessMessage?: string;
  agencySlug?: string;
}

interface AiSearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  result: AiSearchResult | null;
  userRole: number;
  onSelectMetric?: (metricId: string) => void;
}

const TYPE_ICONS = {
  stat: TrendingUp,
  stats_query: TrendingUp,
  doc: FileText,
  documentary_query: FileText,
  action: Zap,
  action_query: Zap,
  ambiguous: AlertCircle,
  fallback: AlertCircle,
  access_denied: AlertCircle,
  unknown: AlertCircle,
};

const TYPE_LABELS = {
  stat: 'Statistique',
  stats_query: 'Statistique',
  doc: 'Documentation',
  documentary_query: 'Documentation',
  action: 'Action',
  action_query: 'Action',
  ambiguous: 'Précision requise',
  fallback: 'Résultat partiel',
  access_denied: 'Accès refusé',
  unknown: 'Type inconnu',
};

const TYPE_COLORS = {
  stat: 'text-emerald-400',
  stats_query: 'text-emerald-400',
  doc: 'text-blue-400',
  documentary_query: 'text-blue-400',
  action: 'text-purple-400',
  action_query: 'text-purple-400',
  ambiguous: 'text-amber-400',
  fallback: 'text-slate-400',
  access_denied: 'text-red-400',
  unknown: 'text-slate-400',
};

export const AiSearchOverlay: React.FC<AiSearchOverlayProps> = ({
  open,
  onOpenChange,
  question,
  onQuestionChange,
  onSubmit,
  loading,
  result,
  userRole,
  onSelectMetric,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus automatique à l'ouverture
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleBackgroundClick = () => onOpenChange(false);
  const handleInnerClick = (e: React.MouseEvent) => e.stopPropagation();

  const TypeIcon = result ? TYPE_ICONS[result.type] : null;
  const isStatResult = result?.type === 'stat' || result?.type === 'stats_query';
  const isDocResult = result?.type === 'doc' || result?.type === 'documentary_query';
  const isAmbiguous = result?.type === 'ambiguous';
  const isError = result?.type === 'access_denied' || result?.accessDenied;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackgroundClick}
        >
          <motion.div
            className="relative w-full max-w-3xl mx-4 bg-slate-900/95 text-slate-50 rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleInnerClick}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/80 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <span className="text-sm font-semibold tracking-wide text-slate-200">
                  Recherche IA
                </span>
              </div>
              <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-full hover:bg-slate-700/80 transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Input */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-3 focus-within:border-sky-500/50 transition-colors">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
                  placeholder="Pose ta question métier ou statistique…"
                  value={question}
                  onChange={(e) => onQuestionChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
                  autoFocus
                />
                <button
                  onClick={onSubmit}
                  disabled={loading || !question.trim()}
                  className={cn('flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all', 'bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed')}
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Valider</span>
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="px-5 pb-5 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {!result && !loading && (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Ex: "Top techniciens ce mois", "Taux de recouvrement", "CA par univers"
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* Badge type */}
                  {TypeIcon && (
                    <div className="flex items-center gap-2">
                      <TypeIcon className={cn('w-4 h-4', TYPE_COLORS[result.type])} />
                      <span className={cn('text-xs font-medium', TYPE_COLORS[result.type])}>
                        {TYPE_LABELS[result.type]}
                      </span>
                    </div>
                  )}

                  {/* Cartes spécialisées */}
                  {isError && (
                    <AiErrorAnswerCard
                      code="ACCESS_DENIED"
                      message={result.accessMessage || result.error || 'Accès refusé'}
                    />
                  )}

                  {isStatResult && result.result && result.interpretation && (
                    <AiStatAnswerCard
                      metricId={(result.interpretation as any).metricId || ''}
                      metricLabel={(result.interpretation as any).metricLabel || 'Statistique'}
                      period={(result.interpretation as any).period || { start: '', end: '', label: '' }}
                      dimension={(result.interpretation as any).dimension || 'global'}
                      filters={(result.interpretation as any).filters}
                      result={result.result as any}
                      agencyName={result.agencySlug}
                    />
                  )}

                  {isDocResult && result.result && (
                    <AiDocAnswerCard
                      results={(result.result as any).results || []}
                      query={question}
                    />
                  )}

                  {isAmbiguous && result.result && onSelectMetric && (
                    <AiAmbiguousAnswerCard
                      message={(result.result as any).message || 'Précision requise'}
                      candidates={(result.result as any).candidates || []}
                      originalQuery={question}
                      onSelectMetric={onSelectMetric}
                    />
                  )}

                  {/* Interprétation */}
                  {result.interpretation && !isStatResult && (
                    <InterpretationCard interpretation={result.interpretation as Record<string, unknown>} />
                  )}

                  {/* Debug N6 */}
                  {userRole >= 6 && result.debug && (
                    <DebugCard debug={result.debug as Record<string, unknown>} />
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
