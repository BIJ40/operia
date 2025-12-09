/**
 * En-tête unifié pour toutes les pages Franchiseur
 */

import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FranchiseurPageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  backLink?: string;
  backLabel?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function FranchiseurPageHeader({
  title,
  subtitle,
  backLink,
  backLabel = 'Retour',
  icon,
  actions,
  className,
}: FranchiseurPageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {backLink && (
        <Link 
          to={backLink}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-helpconfort-blue/20 to-helpconfort-blue/5 border border-helpconfort-blue/20">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-helpconfort-blue to-helpconfort-blue-dark bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
