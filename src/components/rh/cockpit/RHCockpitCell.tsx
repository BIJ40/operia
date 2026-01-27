/**
 * Cellule générique pour le tableau cockpit RH
 * Affiche un indicateur visuel cliquable (style LUCCA)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IndicatorStatus, INDICATOR_COLORS, INDICATOR_ICONS } from '@/hooks/rh/useRHCockpitIndicators';
import { LucideIcon } from 'lucide-react';

interface RHCockpitCellProps {
  /** Statut de l'indicateur */
  status: IndicatorStatus;
  /** Label optionnel (ex: "5/8" pour documents) */
  label?: string | number;
  /** Icône optionnelle à afficher à la place du statut par défaut */
  icon?: LucideIcon;
  /** Action au clic */
  onClick?: () => void;
  /** Tooltip au survol */
  tooltip?: string;
  /** Classes CSS additionnelles */
  className?: string;
  /** Afficher uniquement l'icône (pas le label) */
  iconOnly?: boolean;
  /** Taille de la cellule */
  size?: 'sm' | 'md';
}

export function RHCockpitCell({
  status,
  label,
  icon: Icon,
  onClick,
  tooltip,
  className,
  iconOnly = false,
  size = 'md',
}: RHCockpitCellProps) {
  const colors = INDICATOR_COLORS[status];
  const defaultIcon = INDICATOR_ICONS[status];

  const content = (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all',
        // Taille
        size === 'sm' ? 'px-2 py-1 text-xs min-w-[32px]' : 'px-3 py-1.5 text-sm min-w-[40px]',
        // Couleurs douces style LUCCA
        colors.bg,
        colors.text,
        // Hover si cliquable
        onClick && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current/20 active:scale-95',
        !onClick && 'cursor-default',
        className
      )}
    >
      {/* Icône personnalisée ou par défaut */}
      {Icon ? (
        <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      ) : (
        <span className={cn(size === 'sm' ? 'text-xs' : 'text-sm')}>{defaultIcon}</span>
      )}
      
      {/* Label optionnel */}
      {!iconOnly && label !== undefined && (
        <span className="font-semibold">{label}</span>
      )}
    </button>
  );

  // Avec ou sans tooltip
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

/**
 * Cellule pour afficher un ratio (ex: documents 5/8)
 */
interface RHCockpitRatioCellProps {
  filled: number;
  total: number;
  onClick?: () => void;
  tooltip?: string;
}

export function RHCockpitRatioCell({ filled, total, onClick, tooltip }: RHCockpitRatioCellProps) {
  const status: IndicatorStatus = 
    filled === total ? 'ok' : 
    filled > 0 ? 'warning' : 'error';

  return (
    <RHCockpitCell
      status={status}
      label={`${filled}/${total}`}
      onClick={onClick}
      tooltip={tooltip}
    />
  );
}

/**
 * Cellule pour afficher un nombre (ex: compétences)
 */
interface RHCockpitCountCellProps {
  count: number;
  onClick?: () => void;
  tooltip?: string;
  /** Seuil pour passer de warning à ok */
  threshold?: number;
}

export function RHCockpitCountCell({ count, onClick, tooltip, threshold = 1 }: RHCockpitCountCellProps) {
  const status: IndicatorStatus = count >= threshold ? 'ok' : count > 0 ? 'warning' : 'na';

  return (
    <RHCockpitCell
      status={status}
      label={count}
      onClick={onClick}
      tooltip={tooltip}
    />
  );
}

/**
 * Cellule ICE (contacts d'urgence)
 */
interface RHCockpitICECellProps {
  count: 0 | 1 | 2;
  onClick?: () => void;
}

export function RHCockpitICECell({ count, onClick }: RHCockpitICECellProps) {
  const status: IndicatorStatus = count === 2 ? 'ok' : count === 1 ? 'warning' : 'error';
  const tooltip = count === 2 
    ? '2 contacts d\'urgence renseignés' 
    : count === 1 
      ? '1 contact d\'urgence sur 2' 
      : 'Aucun contact d\'urgence';

  return (
    <RHCockpitCell
      status={status}
      label={count}
      onClick={onClick}
      tooltip={tooltip}
    />
  );
}
