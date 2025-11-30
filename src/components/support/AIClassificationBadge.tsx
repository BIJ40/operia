/**
 * P3#2 - Badge IA pour afficher le statut de classification automatique
 * 🤖 Auto-classé avec indicateur de confiance
 */

import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AI_CATEGORY_LABELS } from '@/lib/support-auto';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

interface AIClassificationBadgeProps {
  isAutoClassified: boolean;
  category?: string | null;
  priority?: string | null;
  confidence?: number | null;
  tags?: string[] | null;
  size?: 'sm' | 'md';
  showDetails?: boolean;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { 
  label: string; 
  icon: typeof CheckCircle2;
  className: string;
}> = {
  high: {
    label: 'Confiance haute',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  },
  medium: {
    label: 'Confiance moyenne',
    icon: Brain,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  },
  low: {
    label: 'Confiance faible',
    icon: AlertCircle,
    className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
  },
};

function getConfidenceLevel(confidence: number | null | undefined): ConfidenceLevel {
  if (!confidence) return 'low';
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function AIClassificationBadge({
  isAutoClassified,
  category,
  priority,
  confidence,
  tags,
  size = 'sm',
  showDetails = false,
}: AIClassificationBadgeProps) {
  if (!isAutoClassified) return null;

  const confidenceLevel = getConfidenceLevel(confidence);
  const config = CONFIDENCE_CONFIG[confidenceLevel];
  const ConfidenceIcon = config.icon;
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  // Format compact ou détaillé
  const label = showDetails && category
    ? `IA · ${AI_CATEGORY_LABELS[category] || category} · ${confidencePercent}%`
    : 'IA';

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-medium flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Classification automatique
      </div>
      {category && (
        <div>Catégorie: <span className="font-medium">{AI_CATEGORY_LABELS[category] || category}</span></div>
      )}
      {priority && (
        <div>Priorité: <span className="font-medium capitalize">{priority}</span></div>
      )}
      <div>Confiance: <span className="font-medium">{confidencePercent}%</span></div>
      {tags && tags.length > 0 && (
        <div>Tags: <span className="font-medium">{tags.join(', ')}</span></div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${config.className} ${sizeClasses} flex items-center gap-1 font-medium cursor-help`}
          >
            <Sparkles className={iconSize} />
            {label}
            {showDetails && <ConfidenceIcon className={iconSize} />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Version compacte pour Kanban (juste icône)
 */
export function AIIndicator({ 
  isAutoClassified, 
  confidence 
}: { 
  isAutoClassified: boolean; 
  confidence?: number | null;
}) {
  if (!isAutoClassified) return null;

  const confidenceLevel = getConfidenceLevel(confidence);
  
  const colorClasses = {
    high: 'text-green-500',
    medium: 'text-yellow-500',
    low: 'text-gray-400',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Sparkles className={`w-4 h-4 ${colorClasses[confidenceLevel]}`} />
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="text-xs">
            Auto-classé ({confidence ? Math.round(confidence * 100) : 0}%)
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
