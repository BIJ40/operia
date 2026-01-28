/**
 * WarmCard - Carte stylisée avec thème "Warm Pastel"
 * Coins ultra-arrondis, ombres douces, animations hover
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface WarmCardProps {
  children: React.ReactNode;
  className?: string;
  /** Variante visuelle */
  variant?: 'default' | 'accent' | 'muted' | 'glass' | 'gradient';
  /** Couleur de l'accent (gradient ou bordure) */
  accentColor?: 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal';
  /** Animation au hover */
  hover?: boolean;
  /** Padding interne */
  padding?: 'none' | 'compact' | 'normal' | 'spacious';
  /** Icône optionnelle */
  icon?: LucideIcon;
  /** Titre optionnel */
  title?: string;
  /** Description optionnelle */
  description?: string;
  onClick?: () => void;
}

const accentGradients = {
  blue: 'from-warm-blue/20 to-warm-teal/10',
  green: 'from-warm-green/20 to-warm-teal/10',
  orange: 'from-warm-orange/20 to-accent/10',
  purple: 'from-warm-purple/20 to-warm-blue/10',
  pink: 'from-warm-pink/20 to-warm-purple/10',
  teal: 'from-warm-teal/20 to-warm-blue/10',
};

const accentBorders = {
  blue: 'border-l-warm-blue',
  green: 'border-l-warm-green',
  orange: 'border-l-warm-orange',
  purple: 'border-l-warm-purple',
  pink: 'border-l-warm-pink',
  teal: 'border-l-warm-teal',
};

const accentIconBg = {
  blue: 'bg-warm-blue/15 text-warm-blue',
  green: 'bg-warm-green/15 text-warm-green',
  orange: 'bg-warm-orange/15 text-warm-orange',
  purple: 'bg-warm-purple/15 text-warm-purple',
  pink: 'bg-warm-pink/15 text-warm-pink',
  teal: 'bg-warm-teal/15 text-warm-teal',
};

const paddingClasses = {
  none: '',
  compact: 'p-4',
  normal: 'p-5',
  spacious: 'p-6',
};

export function WarmCard({
  children,
  className,
  variant = 'default',
  accentColor,
  hover = false,
  padding = 'normal',
  icon: Icon,
  title,
  description,
  onClick,
}: WarmCardProps) {
  const baseClasses = cn(
    'rounded-warm border bg-card text-card-foreground',
    'shadow-warm transition-all duration-300',
    paddingClasses[padding]
  );

  const variantClasses = {
    default: '',
    accent: accentColor
      ? cn('border-l-4', accentBorders[accentColor])
      : 'border-l-4 border-l-primary',
    muted: 'bg-muted/50 border-muted',
    glass: 'bg-card/80 backdrop-blur-sm border-white/20',
    gradient: accentColor
      ? cn('bg-gradient-to-br', accentGradients[accentColor], 'border-transparent')
      : 'bg-gradient-to-br from-primary/10 to-accent/10 border-transparent',
  };

  const hoverClasses = hover
    ? 'hover:shadow-warm-hover hover:-translate-y-0.5 cursor-pointer'
    : '';

  const hasHeader = Icon || title || description;

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], hoverClasses, className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {hasHeader && (
        <div className="flex items-start gap-4 mb-4">
          {Icon && (
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                accentColor ? accentIconBg[accentColor] : 'bg-primary/10 text-primary'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="font-semibold text-foreground leading-tight">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

/** Variante pour une tuile KPI */
interface WarmKpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  accentColor?: WarmCardProps['accentColor'];
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function WarmKpiCard({
  label,
  value,
  icon: Icon,
  accentColor = 'blue',
  trend,
  trendValue,
  className,
}: WarmKpiCardProps) {
  const trendColors = {
    up: 'text-warm-green',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <WarmCard
      variant="gradient"
      accentColor={accentColor}
      padding="compact"
      hover
      className={className}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && trendValue && (
            <p className={cn('text-xs font-medium mt-1', trendColors[trend])}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3',
              accentIconBg[accentColor]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </WarmCard>
  );
}
