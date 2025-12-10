import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MiniSparkline } from './MiniSparkline';
import { MiniGauge } from './MiniGauge';
import { MiniBar } from './MiniBar';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { MiniGraphType } from './types';

interface KpiCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  miniGraphType: MiniGraphType;
  sparklineData?: number[];
  gaugeValue?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export function KpiCard({
  title,
  subtitle,
  value,
  miniGraphType,
  sparklineData = [],
  gaugeValue = 0,
  trend,
  color = 'primary',
  onClick,
  isLoading,
}: KpiCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'border-l-primary',
    blue: 'border-l-helpconfort-blue',
    green: 'border-l-green-500',
    orange: 'border-l-helpconfort-orange',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
  };

  return (
    <Card
      className={cn(
        'relative p-4 border-l-4 cursor-pointer group',
        'hover:shadow-lg hover:scale-[1.02] transition-all duration-200',
        'bg-gradient-to-br from-card to-muted/20',
        colorClasses[color] || colorClasses.primary
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          {subtitle && (
            <span className="text-xs text-muted-foreground/70">{subtitle}</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div className="flex-1">
          {isLoading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
          )}
          
          {/* Trend indicator */}
          {trend && !isLoading && (
            <div className={cn(
              'flex items-center gap-1 text-xs mt-1',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Mini graph */}
        <div className="w-20 h-12 flex-shrink-0">
          {miniGraphType === 'sparkline' && sparklineData.length > 0 && (
            <MiniSparkline data={sparklineData} color={color} />
          )}
          {miniGraphType === 'gauge' && (
            <MiniGauge value={gaugeValue} color={color} />
          )}
          {miniGraphType === 'bar' && sparklineData.length > 0 && (
            <MiniBar data={sparklineData} color={color} />
          )}
        </div>
      </div>
    </Card>
  );
}
