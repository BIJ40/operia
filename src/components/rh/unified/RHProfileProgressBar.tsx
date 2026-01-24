/**
 * Barre de progression pour la complétude du profil
 */

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileCompletenessResult, getCompletenessColor, getCompletenessIcon } from '@/hooks/rh/useProfileCompleteness';

interface RHProfileProgressBarProps {
  completeness: ProfileCompletenessResult;
  showLabel?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RHProfileProgressBar({
  completeness,
  showLabel = true,
  showTooltip = true,
  size = 'md',
  className,
}: RHProfileProgressBarProps) {
  const colors = getCompletenessColor(completeness.percent);
  const icon = getCompletenessIcon(completeness.status);

  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  const textClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const bar = (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className={cn('flex items-center justify-between mb-1', textClasses[size])}>
          <span className="text-muted-foreground">Complétude</span>
          <span className={cn('font-medium', colors.text)}>
            {icon} {completeness.percent}%
          </span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', heightClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colors.progress,
          )}
          style={{ width: `${completeness.percent}%` }}
        />
      </div>
    </div>
  );

  if (!showTooltip || completeness.missing.length === 0) {
    return bar;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{bar}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {completeness.status === 'complete'
                ? '✅ Profil complet'
                : `📋 ${completeness.missing.length} champ(s) manquant(s)`}
            </p>
            {completeness.status !== 'complete' && (
              <div className="space-y-1">
                {completeness.categories
                  .filter(cat => cat.missing.length > 0)
                  .slice(0, 3)
                  .map((cat) => (
                    <div key={cat.id} className="text-xs">
                      <span className="text-muted-foreground">{cat.label}:</span>{' '}
                      <span>{cat.missing.join(', ')}</span>
                    </div>
                  ))}
                {completeness.categories.filter(cat => cat.missing.length > 0).length > 3 && (
                  <p className="text-xs text-muted-foreground">...</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Version compacte pour le tableau
export function RHProfileProgressCompact({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const colors = getCompletenessColor(percent);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden min-w-[40px]">
        <div
          className={cn('h-full rounded-full transition-all duration-300', colors.progress)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn('text-[10px] font-medium tabular-nums', colors.text)}>
        {percent}%
      </span>
    </div>
  );
}

// Jauge circulaire pour les stats header
export function RHProfileProgressCircle({
  percent,
  size = 48,
  strokeWidth = 4,
  className,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const colors = getCompletenessColor(percent);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500', colors.text)}
        />
      </svg>
      <span className={cn('absolute text-xs font-bold tabular-nums', colors.text)}>
        {percent}%
      </span>
    </div>
  );
}
