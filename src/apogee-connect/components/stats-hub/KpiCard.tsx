import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MiniSparkline } from './MiniSparkline';
import { MiniGauge } from './MiniGauge';
import { MiniBar } from './MiniBar';
import { ChevronRight, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { MiniGraphType } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  breakdown?: Record<string, any>;
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
  breakdown,
}: KpiCardProps) {
  const colorClasses: Record<string, string> = {
    primary: 'border-l-primary',
    blue: 'border-l-helpconfort-blue',
    green: 'border-l-green-500',
    orange: 'border-l-helpconfort-orange',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
  };

  // Format breakdown values for display
  const formatBreakdownValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return '–';
    if (typeof val === 'number') {
      if (key.toLowerCase().includes('taux') || key.toLowerCase().includes('percent')) {
        return `${val.toFixed(1)}%`;
      }
      if (key.toLowerCase().includes('montant') || key.toLowerCase().includes('ca') || key.toLowerCase().includes('ht')) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
      }
      return val.toLocaleString('fr-FR');
    }
    return String(val);
  };

  const formatBreakdownLabel = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
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
        <div className="flex items-center gap-1">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          {breakdown && Object.keys(breakdown).length > 0 && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  align="start"
                  className="max-w-xs bg-popover border border-border shadow-lg p-3"
                >
                  <div className="space-y-1.5">
                    <p className="font-semibold text-sm text-foreground mb-2">Détail du calcul</p>
                    {Object.entries(breakdown).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-4 text-xs">
                        <span className="text-muted-foreground">{formatBreakdownLabel(key)}</span>
                        <span className="font-medium text-foreground">{formatBreakdownValue(key, val)}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {subtitle && (
        <span className="text-xs text-muted-foreground/70 block -mt-1 mb-2">{subtitle}</span>
      )}

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

      {/* Mini graph - visible container */}
        <div className="w-24 h-14 flex-shrink-0 bg-muted/30 rounded-md overflow-hidden">
          {miniGraphType === 'sparkline' && sparklineData.length > 0 && (
            <MiniSparkline data={sparklineData} color={color} />
          )}
          {miniGraphType === 'gauge' && (
            <div className="w-full h-full flex items-center justify-center">
              <MiniGauge value={gaugeValue} color={color} />
            </div>
          )}
          {miniGraphType === 'bar' && sparklineData.length > 0 && (
            <MiniBar data={sparklineData} color={color} />
          )}
        </div>
      </div>
    </Card>
  );
}
