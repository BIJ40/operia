/**
 * Overlay plein écran pour la recherche IA
 * Modal avec interprétation + debug
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, AlertCircle, TrendingUp, FileText, Zap } from 'lucide-react';
import { InterpretationCard } from './InterpretationCard';
import { DebugCard } from './DebugCard';
import { cn } from '@/lib/utils';

export interface AiSearchResult {
  type: 'stats_query' | 'documentary_query' | 'action_query' | 'unknown';
  interpretation?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  debug?: Record<string, unknown>;
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
}

const TYPE_ICONS = {
  stats_query: TrendingUp,
  documentary_query: FileText,
  action_query: Zap,
  unknown: AlertCircle,
};

const TYPE_LABELS = {
  stats_query: 'Requête Statistique',
  documentary_query: 'Requête Documentaire',
  action_query: 'Action Demandée',
  unknown: 'Type Inconnu',
};

const TYPE_COLORS = {
  stats_query: 'text-emerald-400',
  documentary_query: 'text-blue-400',
  action_query: 'text-purple-400',
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
}) => {
  const handleBackgroundClick = () => {
    onOpenChange(false);
  };

  const handleInnerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const TypeIcon = result ? TYPE_ICONS[result.type] : null;

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
                <div className="relative">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <motion.div
                    className="absolute inset-0 bg-sky-400/30 rounded-full blur-md"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <span className="text-sm font-semibold tracking-wide text-slate-200">
                  Recherche IA Unifiée
                </span>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-full hover:bg-slate-700/80 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Barre de question */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-800/80 border border-slate-700/80 px-4 py-3 focus-within:border-sky-500/50 transition-colors">
                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
                  placeholder="Pose ta question métier ou statistique…"
                  value={question}
                  onChange={(e) => onQuestionChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={onSubmit}
                  disabled={loading || !question.trim()}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                    'bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Valider</span>
                </button>
              </div>
            </div>

            {/* Contenu réponse */}
            <div className="px-5 pb-5 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Placeholder initial */}
              {!result && !loading && (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">
                    Pose une question métier ou statistique.
                    <br />
                    <span className="text-slate-500 text-xs">
                      Ex: "Quel est le technicien qui a fait le plus de chiffre en électricité ce mois ?"
                    </span>
                  </p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                    <span className="text-sm text-slate-400">Analyse en cours…</span>
                  </div>
                </div>
              )}

              {/* Résultat */}
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

                  {/* Erreur */}
                  {result.error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-200">{result.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Résultat principal */}
                  {result.result && !result.error && (
                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-4">
                      <pre className="text-xs text-slate-100 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Interprétation */}
                  {result.interpretation && (
                    <InterpretationCard 
                      interpretation={result.interpretation as Record<string, unknown>} 
                    />
                  )}

                  {/* Debug N6 uniquement */}
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
