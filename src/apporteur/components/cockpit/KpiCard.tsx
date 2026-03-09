import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import type { TrendValue } from '../../types/apporteur-stats-v2';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  trend?: TrendValue | null;
  subtitle?: string;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
  subtitle,
  onClick,
}: KpiCardProps) {
  const hasTrend = trend && (trend.delta !== 0 || trend.pct !== 0);
  const isPositive = trend && trend.pct > 0;
  const isNegative = trend && trend.pct < 0;

  return (
    <Card
      className={cn(
        'rounded-2xl transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </p>
            <p className="text-xl font-bold text-foreground mt-0.5 truncate">{value}</p>
            {hasTrend && (
              <div className={cn(
                'flex items-center gap-1 mt-1.5 text-xs font-medium',
                isPositive && 'text-[hsl(var(--ap-success))]',
                isNegative && 'text-[hsl(var(--ap-danger))]',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : isNegative ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPositive ? '+' : ''}{trend.pct.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-0.5">vs N-1</span>
              </div>
            )}
            {subtitle && !hasTrend && (
              <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
            )}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
