/**
 * Stats Header amélioré pour le tableau RH
 * Design compact avec indicateurs visuels et progression
 */

import React from 'react';
import { Users, UserCheck, UserX, Briefcase, Wrench, AlertTriangle, TrendingUp, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RHCollaborator } from '@/types/rh-suivi';
import { useProfileCompleteness } from '@/hooks/rh/useProfileCompleteness';

interface RHStatsHeaderProps {
  collaborators: RHCollaborator[];
  activeCount: number;
  formerCount: number;
  adminCount: number;
  terrainCount: number;
  alertsCount?: number;
  averageCompleteness?: number;
  onPrintMatrix: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function RHStatsHeader({
  collaborators,
  activeCount,
  formerCount,
  adminCount,
  terrainCount,
  alertsCount = 0,
  averageCompleteness = 0,
  onPrintMatrix,
  searchQuery,
  onSearchChange,
}: RHStatsHeaderProps) {
  // Couleur de la progression
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border">
      {/* Total */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background rounded-md border shadow-sm hover:shadow transition-shadow cursor-default">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <span className="text-base font-bold tabular-nums">{collaborators.length}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Total des collaborateurs</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Actifs */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background rounded-md border shadow-sm hover:shadow transition-shadow cursor-default">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Actifs</span>
              <span className="text-base font-bold text-green-600 tabular-nums">{activeCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Collaborateurs en activité</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Séparateur visuel */}
      <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

      {/* Admin */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200/50 dark:border-blue-800/50 cursor-default">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{adminCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Personnel administratif</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Terrain */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-md border border-orange-200/50 dark:border-orange-800/50 cursor-default">
              <Wrench className="h-3.5 w-3.5 text-orange-600" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-400">{terrainCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Personnel terrain</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Progression moyenne */}
      {averageCompleteness > 0 && (
        <>
          <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-background rounded-md border shadow-sm cursor-default min-w-[120px]">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Complétude</span>
                      <span className={cn(
                        "text-xs font-bold tabular-nums",
                        averageCompleteness >= 80 ? "text-green-600" :
                        averageCompleteness >= 50 ? "text-amber-600" : "text-red-600"
                      )}>
                        {Math.round(averageCompleteness)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", getProgressColor(averageCompleteness))}
                        style={{ width: `${averageCompleteness}%` }}
                      />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Complétude moyenne des profils</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* Alertes */}
      {alertsCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-300 dark:border-amber-700 cursor-default animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{alertsCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Alertes à traiter (EPI, documents, etc.)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Anciens - si présents */}
      {formerCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border opacity-60 cursor-default">
                <UserX className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{formerCount} ancien{formerCount > 1 ? 's' : ''}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Collaborateurs ayant quitté l'entreprise</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Barre de recherche */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Actions */}
      <Button
        variant="outline"
        size="sm"
        onClick={onPrintMatrix}
        className="h-8 px-3 gap-1.5 text-xs shadow-sm hover:shadow transition-shadow"
      >
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Matrice compétences</span>
        <span className="md:hidden">Imprimer</span>
      </Button>
    </div>
  );
}
