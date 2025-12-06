/**
 * Carte de réponse pour les résultats documentaires
 * Supporte 2 modes:
 * 1. Conversationnel (answer + sources) - nouveau mode IA
 * 2. Liste de résultats (legacy) - fallback
 */

import React from 'react';
import { FileText, ExternalLink, BookOpen, HelpCircle, GraduationCap, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface DocSearchItem {
  id: string;
  title: string;
  snippet?: string;
  url?: string;
  slug?: string;
  source: 'apogee' | 'helpconfort' | 'apporteurs' | 'faq' | 'academy' | string;
  similarity?: number;
  category?: string;
}

interface ConversationalResult {
  answer: string;
  sources: DocSearchItem[];
  isConversational: true;
}

interface LegacyResult {
  results: DocSearchItem[];
}

interface AiDocAnswerCardProps {
  results?: DocSearchItem[];  // Legacy mode
  result?: ConversationalResult | LegacyResult;  // New unified mode
  query: string;
}

const SOURCE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string; bgColor: string }> = {
  apogee: {
    icon: BookOpen,
    label: 'Guide Apogée',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  helpconfort: {
    icon: FileText,
    label: 'HelpConfort',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  apporteurs: {
    icon: FileText,
    label: 'Apporteurs',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  faq: {
    icon: HelpCircle,
    label: 'FAQ',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  academy: {
    icon: GraduationCap,
    label: 'Academy',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
  },
};

export const AiDocAnswerCard: React.FC<AiDocAnswerCardProps> = ({ results: legacyResults, result, query }) => {
  const [showSources, setShowSources] = React.useState(false);
  
  // Déterminer le mode
  const isConversational = result && 'answer' in result && result.isConversational;
  const conversationalData = isConversational ? result as ConversationalResult : null;
  
  // Récupérer les résultats selon le mode
  const items: DocSearchItem[] = legacyResults || 
    (result && 'results' in result ? (result as LegacyResult).results : null) ||
    [];
  
  // Mode conversationnel - réponse IA avec sources
  if (conversationalData) {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900/60 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Réponse</h3>
            <p className="text-xs text-slate-400">Basée sur la documentation</p>
          </div>
        </div>
        
        {/* Réponse conversationnelle */}
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="text-sm text-slate-200 leading-relaxed mb-3">{children}</p>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-100 mt-4 mb-2">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm text-slate-300">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
              code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-slate-700 text-blue-300 text-xs">{children}</code>,
            }}
          >
            {conversationalData.answer}
          </ReactMarkdown>
        </div>
        
        {/* Sources (collapsible) */}
        {conversationalData.sources && conversationalData.sources.length > 0 && (
          <div className="pt-3 border-t border-slate-700/50">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {conversationalData.sources.length} source(s) consultée(s)
            </button>
            
            {showSources && (
              <div className="mt-3 space-y-2">
                {conversationalData.sources.map((source, idx) => {
                  const config = SOURCE_CONFIG[source.source] || SOURCE_CONFIG.apogee;
                  const SourceIcon = config.icon;
                  const url = source.url || (source.slug ? `/academy/apogee/category/${source.slug}` : undefined);
                  
                  return (
                    <div
                      key={source.id || idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 text-xs"
                    >
                      <SourceIcon className={cn('w-3.5 h-3.5', config.color)} />
                      <span className="text-slate-300 flex-1 truncate">{source.title}</span>
                      {source.similarity !== undefined && (
                        <span className="text-slate-500">{Math.round(source.similarity * 100)}%</span>
                      )}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Mode legacy - liste de résultats
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-5">
        <div className="flex items-center gap-3 text-slate-400">
          <FileText className="w-5 h-5" />
          <p className="text-sm">Aucun document trouvé pour "{query}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900/60 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">Résultats documentaires</h3>
          <p className="text-xs text-slate-400">{items.length} document(s) trouvé(s)</p>
        </div>
      </div>
      
      {/* Liste des résultats */}
      <div className="space-y-3">
        {items.map((item) => {
          const config = SOURCE_CONFIG[item.source] || SOURCE_CONFIG.apogee;
          const SourceIcon = config.icon;
          const url = item.url || (item.slug ? `/academy/apogee/category/${item.slug}` : '#');
          
          return (
            <a
              key={item.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                  <SourceIcon className={cn('w-4 h-4', config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-slate-100 truncate group-hover:text-white">
                      {item.title}
                    </h4>
                    <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  
                  {item.snippet && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {item.snippet}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', config.bgColor, config.color)}>
                      {config.label}
                    </span>
                    {item.category && (
                      <span className="text-xs text-slate-500">{item.category}</span>
                    )}
                    {item.similarity !== undefined && (
                      <span className="text-xs text-slate-500">
                        {Math.round(item.similarity * 100)}% pertinent
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};