/**
 * WarmEmptyState - État vide stylisé "Warm Pastel"
 * Pour pages d'erreur, états vides, etc.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface WarmEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Couleur du fond de l'icône */
  accentColor?: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal' | 'destructive' | 'muted';
  /** Action principale */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /** Action secondaire */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Texte additionnel en bas */
  footer?: string;
  className?: string;
  children?: React.ReactNode;
}

const iconBgColors = {
  blue: 'bg-warm-blue/15 text-warm-blue',
  green: 'bg-warm-green/15 text-warm-green',
  orange: 'bg-warm-orange/15 text-warm-orange',
  purple: 'bg-warm-purple/15 text-warm-purple',
  pink: 'bg-warm-pink/15 text-warm-pink',
  teal: 'bg-warm-teal/15 text-warm-teal',
  destructive: 'bg-destructive/15 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

export function WarmEmptyState({
  icon: Icon,
  title,
  description,
  accentColor = 'muted',
  action,
  secondaryAction,
  footer,
  className,
  children,
}: WarmEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6',
        className
      )}
    >
      {/* Icône */}
      <div
        className={cn(
          'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
          'shadow-warm',
          iconBgColors[accentColor]
        )}
      >
        <Icon className="w-10 h-10" />
      </div>

      {/* Titre */}
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}

      {/* Contenu custom */}
      {children}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="min-w-[140px]"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <p className="text-xs text-muted-foreground mt-6">{footer}</p>
      )}
    </div>
  );
}
