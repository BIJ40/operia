/**
 * Prévisualisation d'un widget StatIA
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Euro, Percent, Hash, Clock,
  BarChart3, Users, Building2, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetConfig } from '../hooks/useStatiaWidgets';

interface WidgetPreviewProps {
  title: string;
  value: any;
  unit?: string;
  config?: WidgetConfig;
  widgetType?: 'kpi' | 'chart' | 'gauge' | 'table';
  isLoading?: boolean;
  trend?: number; // % de changement
  className?: string;
  compact?: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  euro: Euro,
  percent: Percent,
  hash: Hash,
  clock: Clock,
  chart: BarChart3,
  users: Users,
  building: Building2,
  wrench: Wrench,
  trending: TrendingUp,
};

const COLOR_PRESETS: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', icon: 'text-green-500' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300', icon: 'text-orange-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-500' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
  helpconfort: { bg: 'bg-helpconfort-blue/10', text: 'text-helpconfort-blue', icon: 'text-helpconfort-blue' },
};

function formatWidgetValue(value: any, unit?: string, format?: WidgetConfig['format']): string {
  if (value === null || value === undefined) return '–';
  
  const num = typeof value === 'object' ? Object.keys(value).length : Number(value);
  
  if (format === 'currency' || unit === '€') {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(num);
  }
  
  if (format === 'percent' || unit === '%') {
    return `${num.toFixed(1)}%`;
  }
  
  if (format === 'days' || unit === 'jours') {
    return `${num.toFixed(1)}j`;
  }
  
  if (typeof value === 'object') {
    return `${num} éléments`;
  }
  
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function WidgetPreview({
  title,
  value,
  unit,
  config = {},
  widgetType = 'kpi',
  isLoading,
  trend,
  className,
  compact = false,
}: WidgetPreviewProps) {
  const colorPreset = COLOR_PRESETS[config.color || 'blue'];
  const IconComponent = ICON_MAP[config.icon || 'chart'];
  
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border",
        colorPreset.bg,
        className
      )}>
        <div className={cn("w-6 h-6 rounded flex items-center justify-center", colorPreset.bg)}>
          <IconComponent className={cn("w-3 h-3", colorPreset.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground truncate">{title}</div>
          <div className={cn("text-sm font-bold", colorPreset.text)}>
            {isLoading ? '...' : formatWidgetValue(value, unit, config.format)}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      colorPreset.bg,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              colorPreset.text
            )}>
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                formatWidgetValue(value, unit, config.format)
              )}
            </p>
            
            {trend !== undefined && config.showTrend !== false && (
              <div className="flex items-center gap-1 mt-1">
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-white/50 dark:bg-black/20"
          )}>
            <IconComponent className={cn("w-5 h-5", colorPreset.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WidgetPreview;
