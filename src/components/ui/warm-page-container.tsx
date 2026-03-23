/**
 * WarmPageContainer - Conteneur de page avec thème "Warm Pastel"
 * Applique le fond gradient, espacement et animations cohérents
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface WarmPageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Affiche un header avec titre et description */
  title?: string;
  description?: string;
  /** Contenu à droite du header (boutons, etc.) */
  headerRight?: React.ReactNode;
  /** Largeur max du contenu */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full';
  /** Padding vertical */
  padding?: 'compact' | 'normal' | 'spacious';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

const paddingClasses = {
  compact: 'py-4',
  normal: 'py-6',
  spacious: 'py-10',
};

export function WarmPageContainer({
  children,
  className,
  title,
  description,
  headerRight,
  maxWidth = '7xl',
  padding = 'normal',
}: WarmPageContainerProps) {
  return (
    <div
      className={cn(
        'min-h-full w-full',
        'bg-gradient-to-br from-background via-background to-muted/30',
        className
      )}
    >
      <div
        className={cn(
          'container mx-auto px-4',
          maxWidthClasses[maxWidth],
          paddingClasses[padding]
        )}
      >
        {/* Header optionnel */}
        {(title || headerRight) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
          </div>
        )}

        {/* Contenu */}
        <div className="space-y-6 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
