/**
 * WarmCard - Carte arrondie avec style chaleureux
 * 
 * Design system "Warm Dashboard":
 * - Border-radius ultra-arrondi (20px)
 * - Ombres douces et diffuses
 * - Hover avec légère élévation
 * - Support de variantes de couleur pastel
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type WarmColorVariant = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal' | 'neutral';

interface WarmCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: WarmColorVariant;
  icon?: LucideIcon;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
  animate?: boolean;
  delay?: number;
}

const variantStyles: Record<WarmColorVariant, { bg: string; iconBg: string; iconColor: string; border: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/80 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/20',
    iconBg: 'bg-warm-blue/15',
    iconColor: 'text-warm-blue',
    border: 'border-blue-200/50 dark:border-blue-800/30',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/20',
    iconBg: 'bg-warm-green/15',
    iconColor: 'text-warm-green',
    border: 'border-emerald-200/50 dark:border-emerald-800/30',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50/80 to-amber-100/40 dark:from-orange-950/30 dark:to-amber-900/20',
    iconBg: 'bg-warm-orange/15',
    iconColor: 'text-warm-orange',
    border: 'border-orange-200/50 dark:border-orange-800/30',
  },
  purple: {
    bg: 'bg-gradient-to-br from-violet-50/80 to-purple-100/40 dark:from-violet-950/30 dark:to-purple-900/20',
    iconBg: 'bg-warm-purple/15',
    iconColor: 'text-warm-purple',
    border: 'border-violet-200/50 dark:border-violet-800/30',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-50/80 to-rose-100/40 dark:from-pink-950/30 dark:to-rose-900/20',
    iconBg: 'bg-warm-pink/15',
    iconColor: 'text-warm-pink',
    border: 'border-pink-200/50 dark:border-pink-800/30',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50/80 to-cyan-100/40 dark:from-teal-950/30 dark:to-cyan-900/20',
    iconBg: 'bg-warm-teal/15',
    iconColor: 'text-warm-teal',
    border: 'border-teal-200/50 dark:border-teal-800/30',
  },
  neutral: {
    bg: 'bg-card',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    border: 'border-border',
  },
};

export function WarmCard({
  children,
  className,
  variant = 'neutral',
  icon: Icon,
  title,
  subtitle,
  onClick,
  animate = true,
  delay = 0,
}: WarmCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-warm border p-5',
        'shadow-warm transition-all duration-300',
        'hover:shadow-warm-hover hover:scale-[1.02]',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header avec icône et titre */}
      {(Icon || title) && (
        <div className="flex items-start gap-3 mb-4">
          {Icon && (
            <div className={cn('p-2.5 rounded-xl', styles.iconBg)}>
              <Icon className={cn('h-5 w-5', styles.iconColor)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="font-semibold text-foreground leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contenu */}
      {children}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: delay * 0.05 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * WarmCardCompact - Version compacte pour KPIs
 */
interface WarmCardCompactProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  variant?: WarmColorVariant;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  onClick?: () => void;
}

export function WarmCardCompact({
  value,
  label,
  icon: Icon,
  variant = 'blue',
  trend,
  className,
  onClick,
}: WarmCardCompactProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'relative overflow-hidden rounded-warm border p-4',
        'shadow-warm transition-all duration-300',
        'hover:shadow-warm-hover hover:scale-[1.02]',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-foreground leading-none mb-1">
            {value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              trend.isPositive ? 'text-warm-green' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-xl shrink-0', styles.iconBg)}>
            <Icon className={cn('h-4 w-4', styles.iconColor)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default WarmCard;
