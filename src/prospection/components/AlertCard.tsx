/**
 * AlertCard - Carte d'alerte pour la page Veille
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import type { InsightLevel } from '../engine/insights';

interface Props {
  apporteurName: string;
  title: string;
  description: string;
  level: InsightLevel;
  metric?: string;
  onClick?: () => void;
}

const LEVEL_STYLES: Record<InsightLevel, { icon: React.ElementType; badge: 'destructive' | 'default' | 'secondary' | 'outline'; border: string }> = {
  danger: { icon: AlertCircle, badge: 'destructive', border: 'border-destructive/30' },
  warning: { icon: AlertTriangle, badge: 'default', border: 'border-amber-500/30' },
  opportunity: { icon: TrendingDown, badge: 'secondary', border: 'border-green-500/30' },
  info: { icon: TrendingDown, badge: 'outline', border: 'border-blue-500/30' },
};

export function AlertCard({ apporteurName, title, description, level, metric, onClick }: Props) {
  const style = LEVEL_STYLES[level];
  const Icon = style.icon;

  return (
    <Card 
      className={`border ${style.border} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{apporteurName}</span>
              <Badge variant={style.badge} className="text-[10px]">{title}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
