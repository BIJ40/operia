/**
 * AI Inline Result - Displays results directly under the search bar
 * No modal, no overlay - fluid inline experience
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { AiMessage, StatResultData, DocResultData, ChartData } from './types';
import { AiStatChartCard } from './AiStatChartCard';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AiInlineResultProps {
  messages: AiMessage[];
  isLoading: boolean;
  onClose: () => void;
  onContactSupport?: () => void;
}

export function AiInlineResult({ messages, isLoading, onClose, onContactSupport }: AiInlineResultProps) {
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];
  
  if (!lastAssistantMessage && !isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-2xl mx-auto mt-2"
      >
        <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Réponse IA</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-96">
            <div className="p-4 space-y-4">
              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Je réfléchis...</span>
                </div>
              )}

              {/* Message content */}
              {lastAssistantMessage && (
                <div className="space-y-4">
                  {/* Text content with markdown */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{lastAssistantMessage.content}</ReactMarkdown>
                  </div>

                  {/* Stat with Chart */}
                  {(lastAssistantMessage.type === 'stat' || lastAssistantMessage.type === 'chart') && 
                   lastAssistantMessage.data && (
                    <StatResultView 
                      data={lastAssistantMessage.data as StatResultData} 
                      showChart={lastAssistantMessage.type === 'chart'}
                    />
                  )}

                  {/* Doc results */}
                  {lastAssistantMessage.type === 'doc' && lastAssistantMessage.data && (
                    <DocResultView data={lastAssistantMessage.data as DocResultData} />
                  )}

                  {/* Error state */}
                  {lastAssistantMessage.type === 'error' && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{lastAssistantMessage.content}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/hc-agency/indicateurs">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Pilotage
                </Link>
              </Button>
            </div>
            
            {onContactSupport && (
              <Button variant="ghost" size="sm" onClick={onContactSupport}>
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                Contacter le support
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Sub-component for stat results
function StatResultView({ data, showChart }: { data: StatResultData; showChart?: boolean }) {
  const hasRanking = data.ranking && data.ranking.length > 0;
  const hasChart = showChart && data.chart;

  return (
    <div className="space-y-4">
      {/* Period badge */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1">
          📊 {data.metricLabel}
        </Badge>
        {data.period.label && (
          <Badge 
            variant={data.period.isDefault ? "outline" : "secondary"} 
            className={cn(data.period.isDefault && "border-dashed border-amber-500/50 text-amber-600")}
          >
            📅 {data.period.label}
            {data.period.isDefault && <span className="text-[10px] ml-1">(par défaut)</span>}
          </Badge>
        )}
        {data.agencyName && (
          <Badge variant="outline">🏢 {data.agencyName}</Badge>
        )}
      </div>

      {/* Chart if available */}
      {hasChart && data.chart && (
        <AiStatChartCard chart={data.chart} />
      )}

      {/* Simple value display (if no chart and no ranking) */}
      {!hasChart && !hasRanking && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-2xl font-bold text-primary">
            {formatValue(data.value, data.unit)}
          </p>
        </div>
      )}

      {/* Ranking table (if no chart) */}
      {!hasChart && hasRanking && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">#</th>
                <th className="text-left px-3 py-2 font-medium">Nom</th>
                <th className="text-right px-3 py-2 font-medium">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking!.slice(0, 5).map((item, idx) => (
                <tr key={item.id} className={cn("border-t", idx === 0 && "bg-primary/5")}>
                  <td className="px-3 py-2">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : item.rank}
                  </td>
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-right text-primary font-medium">
                    {formatValue(item.value, data.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top item highlight */}
      {data.topItem && !hasRanking && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <span className="text-xl">🏆</span>
          <div>
            <p className="font-medium">{data.topItem.name}</p>
            <p className="text-sm text-muted-foreground">Meilleur résultat</p>
          </div>
          <p className="ml-auto font-bold text-primary">
            {formatValue(data.topItem.value, data.unit)}
          </p>
        </div>
      )}
    </div>
  );
}

// Sub-component for doc results
function DocResultView({ data }: { data: DocResultData }) {
  if (!data.results || data.results.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>Aucun document trouvé</p>
      </div>
    );
  }

  const sourceLabels: Record<string, { label: string; emoji: string }> = {
    apogee: { label: 'Apogée', emoji: '📘' },
    helpconfort: { label: 'HelpConfort', emoji: '🏠' },
    apporteurs: { label: 'Apporteurs', emoji: '🤝' },
    faq: { label: 'FAQ', emoji: '❓' },
  };

  return (
    <div className="space-y-2">
      {data.results.slice(0, 5).map((doc) => {
        const source = sourceLabels[doc.source] || { label: doc.source, emoji: '📄' };
        
        return (
          <Link
            key={doc.id}
            to={doc.url}
            className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0">{source.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{source.label}</Badge>
                  {doc.similarity && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(doc.similarity * 100)}%
                    </Badge>
                  )}
                </div>
                <h5 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {doc.title}
                </h5>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {doc.snippet}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Helper
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
  
  return new Intl.NumberFormat('fr-FR').format(value);
}
