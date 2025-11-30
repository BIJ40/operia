/**
 * P3#2 - Badge "Incomplet" pour tickets détectés comme manquant d'informations
 */

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AIIncompleteBadgeProps {
  isIncomplete: boolean;
  reasons?: string[];
  size?: 'sm' | 'md';
}

export function AIIncompleteBadge({
  isIncomplete,
  reasons = [],
  size = 'sm',
}: AIIncompleteBadgeProps) {
  if (!isIncomplete) return null;

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  const tooltipContent = (
    <div className="space-y-1 text-xs max-w-xs">
      <div className="font-medium flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Informations manquantes
      </div>
      {reasons.length > 0 ? (
        <ul className="list-disc list-inside space-y-0.5">
          {reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p>Le ticket manque de détails pour être traité efficacement.</p>
      )}
      <p className="text-muted-foreground italic">
        Demandez plus d'informations à l'utilisateur.
      </p>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 ${sizeClasses} flex items-center gap-1 font-medium cursor-help`}
          >
            <AlertTriangle className={iconSize} />
            Infos manquantes
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Version compacte pour Kanban (juste icône)
 */
export function IncompleteIndicator({ 
  isIncomplete 
}: { 
  isIncomplete: boolean;
}) {
  if (!isIncomplete) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="text-xs">Informations manquantes</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
