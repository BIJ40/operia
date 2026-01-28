/**
 * AdminViewHeader - Header standardisé pour les vues Admin
 * Affiche breadcrumb, titre et actions contextuelles
 */

import { ReactNode } from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminViewHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb: string[];
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function AdminViewHeader({ 
  title, 
  subtitle,
  breadcrumb, 
  actions,
  icon,
  className 
}: AdminViewHeaderProps) {
  return (
    <div className={cn("space-y-2 pb-4", className)}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Settings className="w-3.5 h-3.5" />
        {breadcrumb.map((item, index) => (
          <div key={item} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5" />}
            <span className={cn(
              index === breadcrumb.length - 1 && "text-foreground font-medium"
            )}>
              {item}
            </span>
          </div>
        ))}
      </nav>
      
      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
