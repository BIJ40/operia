/**
 * Carte de réponse pour les résultats documentaires
 */

import React from 'react';
import { FileText, ExternalLink, BookOpen, HelpCircle, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocSearchItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: 'apogee' | 'helpconfort' | 'apporteurs' | 'faq' | 'academy';
  similarity?: number;
  category?: string;
}

interface AiDocAnswerCardProps {
  results: DocSearchItem[];
  query: string;
}

const SOURCE_CONFIG = {
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

export const AiDocAnswerCard: React.FC<AiDocAnswerCardProps> = ({ results, query }) => {
  if (results.length === 0) {
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
          <p className="text-xs text-slate-400">{results.length} document(s) trouvé(s)</p>
        </div>
      </div>
      
      {/* Liste des résultats */}
      <div className="space-y-3">
        {results.map((item) => {
          const config = SOURCE_CONFIG[item.source] || SOURCE_CONFIG.apogee;
          const SourceIcon = config.icon;
          
          return (
            <a
              key={item.id}
              href={item.url}
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
                  
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {item.snippet}
                  </p>
                  
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
