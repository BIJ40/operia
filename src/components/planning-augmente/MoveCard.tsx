/**
 * MoveCard - Affiche un move d'optimisation avec gain et risque
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRightLeft, MoveRight, UserCheck, Clock, Euro, AlertTriangle } from 'lucide-react';

interface Move {
  type: 'swap' | 'move' | 'reassign';
  description: string;
  from: string;
  to: string;
  gain_minutes: number;
  gain_ca: number;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
}

interface MoveCardProps {
  move: Move;
  index: number;
  onApply?: () => void;
  isLoading?: boolean;
}

const TYPE_ICONS = {
  swap: ArrowRightLeft,
  move: MoveRight,
  reassign: UserCheck,
};

const TYPE_LABELS = {
  swap: 'Échange',
  move: 'Déplacement',
  reassign: 'Réassignation',
};

const RISK_STYLES = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const RISK_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };

export function MoveCard({ move, index, onApply, isLoading }: MoveCardProps) {
  const Icon = TYPE_ICONS[move.type];

  return (
    <Card className="border-l-4 border-l-accent/50">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <Icon className="w-3 h-3 mr-1" />
              {TYPE_LABELS[move.type]}
            </Badge>
            <span className="text-sm font-medium text-foreground">
              Move #{index + 1}
            </span>
          </div>
          <Badge className={`text-xs ${RISK_STYLES[move.risk]}`}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Risque {RISK_LABELS[move.risk]}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground">{move.description}</p>

        {/* Gains */}
        <div className="flex gap-4 text-xs">
          {move.gain_minutes > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Clock className="w-3.5 h-3.5" />
              <span>−{move.gain_minutes} min route</span>
            </div>
          )}
          {move.gain_ca > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Euro className="w-3.5 h-3.5" />
              <span>+{move.gain_ca}€ CA potentiel</span>
            </div>
          )}
        </div>

        {/* Explanation */}
        <p className="text-xs text-muted-foreground italic">{move.explanation}</p>

        {/* From → To */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded px-2 py-1">
            <span className="text-muted-foreground">De:</span> {move.from}
          </div>
          <div className="bg-muted/50 rounded px-2 py-1">
            <span className="text-muted-foreground">Vers:</span> {move.to}
          </div>
        </div>

        {/* Apply */}
        {onApply && (
          <Button size="sm" onClick={onApply} disabled={isLoading} className="w-full">
            <Check className="w-3.5 h-3.5 mr-1" />
            Appliquer ce move
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
