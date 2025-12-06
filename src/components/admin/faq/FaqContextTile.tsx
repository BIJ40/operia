/**
 * FAQ Context Tile - Shows stats for a context type
 */

import { FaqContextStats } from './types';
import { ChevronRight } from 'lucide-react';

interface FaqContextTileProps {
  stats: FaqContextStats;
  onClick: () => void;
}

export function FaqContextTile({ stats, onClick }: FaqContextTileProps) {
  const isEmpty = stats.count === 0;
  
  return (
    <button
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-200
        hover:shadow-lg hover:scale-[1.02] hover:border-primary/30
        ${isEmpty ? 'bg-muted/30 border-border/50' : 'bg-card border-border'}
      `}
    >
      {/* Gradient background */}
      <div 
        className={`absolute inset-0 opacity-5 bg-gradient-to-br from-${stats.color} to-transparent`}
      />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{stats.icon}</span>
            <h3 className="text-lg font-semibold">{stats.label}</h3>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        
        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{stats.count}</span>
            <span className="text-muted-foreground text-sm">Q/R</span>
          </div>
          
          {stats.count > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{stats.categories} catégorie{stats.categories > 1 ? 's' : ''}</span>
              <span className="text-green-600">{stats.publishedPercent}% publiées</span>
            </div>
          )}
          
          {isEmpty && (
            <p className="text-sm text-muted-foreground">Aucune FAQ dans ce contexte</p>
          )}
        </div>
      </div>
    </button>
  );
}
