/**
 * HumanTitle - Affiche un titre conversationnel avec animation
 * 
 * Utilise le hook useHumanTitle pour afficher des titres
 * humains et engageants à la place des titres administratifs
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHumanTitle, TitleKey } from './hooks/useHumanTitles';

interface HumanTitleProps {
  titleKey: TitleKey;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

const sizeStyles = {
  sm: {
    title: 'text-sm font-medium',
    subtitle: 'text-xs',
    icon: 'h-4 w-4',
    gap: 'gap-2',
  },
  md: {
    title: 'text-base font-semibold',
    subtitle: 'text-sm',
    icon: 'h-5 w-5',
    gap: 'gap-2.5',
  },
  lg: {
    title: 'text-lg font-bold',
    subtitle: 'text-sm',
    icon: 'h-6 w-6',
    gap: 'gap-3',
  },
};

export function HumanTitle({
  titleKey,
  icon: Icon,
  iconColor = 'text-primary',
  className,
  size = 'md',
  showSubtitle = true,
}: HumanTitleProps) {
  const { title, subtitle } = useHumanTitle(titleKey);
  const styles = sizeStyles[size];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex items-center', styles.gap, className)}
    >
      {Icon && (
        <Icon className={cn(styles.icon, iconColor)} />
      )}
      <div className="flex flex-col">
        <span className={cn(styles.title, 'text-foreground leading-tight')}>
          {title}
        </span>
        {showSubtitle && subtitle && (
          <span className={cn(styles.subtitle, 'text-muted-foreground leading-tight')}>
            {subtitle}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Version inline pour les headers de carte
 */
interface HumanTitleInlineProps {
  titleKey: TitleKey;
  className?: string;
}

export function HumanTitleInline({ titleKey, className }: HumanTitleInlineProps) {
  const { title } = useHumanTitle(titleKey);
  
  return (
    <span className={cn('font-semibold text-foreground', className)}>
      {title}
    </span>
  );
}

export default HumanTitle;
