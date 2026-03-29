/**
 * AdminViewHeader — En-tête unifié pour toutes les vues admin Gestion.
 * Garantit un style cohérent : titre h2, sous-titre, badge et actions à droite.
 */

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

interface AdminViewHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

export function AdminViewHeader({ title, subtitle, badge = 'V2', children }: AdminViewHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {badge && (
          <Badge variant="outline" className="text-xs">{badge}</Badge>
        )}
      </div>
    </div>
  );
}
