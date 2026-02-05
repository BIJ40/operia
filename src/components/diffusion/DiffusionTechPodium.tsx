/**
 * DiffusionTechPodium - Podium techniciens pour Diffusion TV
 * Trio gagnant (médailles) + liste des autres techniciens
 */

import { Card } from '@/components/ui/card';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Trophy, Medal, Award } from 'lucide-react';
import { TechnicienRanking } from './useDiffusionKpisStatia';
import { cn } from '@/lib/utils';

interface DiffusionTechPodiumProps {
  ranking: TechnicienRanking[];
  isLoading?: boolean;
}

const MEDAL_CONFIG = [
  { 
    position: 1, 
    emoji: '🥇', 
    icon: Trophy,
    bgClass: 'bg-gradient-to-br from-yellow-100 to-amber-50',
    borderClass: 'border-yellow-400',
    textClass: 'text-yellow-700',
    size: 'h-36',
  },
  { 
    position: 2, 
    emoji: '🥈', 
    icon: Medal,
    bgClass: 'bg-gradient-to-br from-slate-100 to-gray-50',
    borderClass: 'border-slate-400',
    textClass: 'text-slate-600',
    size: 'h-32',
  },
  { 
    position: 3, 
    emoji: '🥉', 
    icon: Award,
    bgClass: 'bg-gradient-to-br from-orange-100 to-amber-50',
    borderClass: 'border-orange-400',
    textClass: 'text-orange-700',
    size: 'h-28',
  },
];

const cleanPodiumLabel = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/[\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getTechDisplayName = (tech: TechnicienRanking): string => {
  const name = cleanPodiumLabel(tech.nom);
  if (name) return name;
  // Fallback visuel : on affiche quelque chose dans la tile plutôt que "vide"
  return `Technicien #${tech.rank}`;
};

export const DiffusionTechPodium = ({ ranking, isLoading }: DiffusionTechPodiumProps) => {
  if (isLoading) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-48" />
          <div className="flex justify-center gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 w-32 bg-muted/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!ranking || ranking.length === 0) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
        <p className="text-muted-foreground text-center">Aucun technicien actif ce mois</p>
      </Card>
    );
  }

  // Trio gagnant (positions 1, 2, 3)
  const trio = ranking.slice(0, 3);
  // Les autres (position 4+)
  const others = ranking.slice(3);

  // Réordonner le trio pour l'affichage podium : 2e, 1er, 3e
  const podiumOrder = trio.length >= 3 
    ? [trio[1], trio[0], trio[2]]
    : trio.length === 2 
      ? [trio[1], trio[0]] 
      : trio;

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
      <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warm-orange" />
        Classement Techniciens
      </h3>

      {/* Podium Trio */}
      <div className="flex justify-center items-end gap-4 mb-6">
        {podiumOrder.map((tech, displayIndex) => {
          const actualRank = tech.rank;
          const config = MEDAL_CONFIG.find(m => m.position === actualRank) || MEDAL_CONFIG[2];
          
          return (
            <div
              key={tech.id}
              className={cn(
                'flex flex-col items-center justify-end rounded-2xl border-2 p-4 transition-all hover:scale-105',
                config.bgClass,
                config.borderClass,
                config.size,
                actualRank === 1 ? 'w-40' : 'w-36'
              )}
            >
              <span className="text-3xl mb-2">{config.emoji}</span>
              <p className={cn('font-bold text-sm truncate max-w-full', config.textClass)}>
                {getTechDisplayName(tech)}
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatEuros(tech.caHT)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Autres techniciens (4e+) */}
      {others.length > 0 && (
        <div className="border-t border-border/30 pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Autres techniciens
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {others.map(tech => (
              <div
                key={tech.id}
                className="flex flex-col items-center p-3 bg-muted/10 rounded-xl border border-border/20 hover:bg-muted/20 transition-colors"
              >
                <span className="text-xs text-muted-foreground mb-1">#{tech.rank}</span>
                <p className="font-medium text-sm text-foreground truncate max-w-full">
                  {getTechDisplayName(tech)}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatEuros(tech.caHT)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
