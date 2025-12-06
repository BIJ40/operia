/**
 * Carte d'affichage des erreurs
 */

import React from 'react';
import { AlertCircle, ShieldX, Clock, HelpCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiErrorAnswerCardProps {
  code: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

const ERROR_CONFIG: Record<string, {
  icon: typeof AlertCircle;
  title: string;
  color: string;
  bgColor: string;
}> = {
  ACCESS_DENIED: {
    icon: ShieldX,
    title: 'Accès refusé',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  METRIC_NOT_FOUND: {
    icon: HelpCircle,
    title: 'Métrique non trouvée',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  PERIOD_INVALID: {
    icon: Clock,
    title: 'Période invalide',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  UNKNOWN_METRIC: {
    icon: HelpCircle,
    title: 'Métrique inconnue',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  LLM_TIMEOUT: {
    icon: Clock,
    title: 'Délai dépassé',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
  AGENCY_SCOPE_VIOLATION: {
    icon: ShieldX,
    title: 'Scope non autorisé',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  INTERNAL_ERROR: {
    icon: AlertCircle,
    title: 'Erreur interne',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
};

export const AiErrorAnswerCard: React.FC<AiErrorAnswerCardProps> = ({
  code,
  message,
  details,
  onRetry,
}) => {
  const config = ERROR_CONFIG[code] || ERROR_CONFIG.INTERNAL_ERROR;
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'rounded-xl border p-5 space-y-3',
      code === 'ACCESS_DENIED' || code === 'AGENCY_SCOPE_VIOLATION'
        ? 'border-red-500/40 bg-gradient-to-br from-red-950/40 to-slate-900/60'
        : code === 'METRIC_NOT_FOUND' || code === 'UNKNOWN_METRIC'
        ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-slate-900/60'
        : 'border-slate-700/80 bg-slate-800/50'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>
        <div className="flex-1">
          <h3 className={cn('text-base font-semibold', config.color)}>{config.title}</h3>
          <p className="text-sm text-slate-300 mt-1">{message}</p>
        </div>
      </div>
      
      {/* Détails */}
      {details && (
        <p className="text-xs text-slate-400 pl-12">{details}</p>
      )}
      
      {/* Actions */}
      {onRetry && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </button>
        </div>
      )}
      
      {/* Suggestions selon le type d'erreur */}
      {(code === 'METRIC_NOT_FOUND' || code === 'UNKNOWN_METRIC') && (
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">
            💡 <strong>Suggestions :</strong> Essayez des formulations comme "CA par technicien", 
            "taux de recouvrement", "top apporteurs", "dossiers par univers"...
          </p>
        </div>
      )}
      
      {code === 'ACCESS_DENIED' && (
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">
            🔒 Cette statistique nécessite un niveau d'accès supérieur. Contactez votre responsable si vous pensez devoir y avoir accès.
          </p>
        </div>
      )}
    </div>
  );
};
