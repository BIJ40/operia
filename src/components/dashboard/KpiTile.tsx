import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KpiTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  tooltip?: string;
}

export function KpiTile({ title, value, subtitle, icon: Icon, isLoading, trend, tooltip }: KpiTileProps) {
  const cardContent = (
    <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-default">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground truncate">{title}</CardTitle>
        <div className="p-2 rounded-full bg-accent/20 flex-shrink-0">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full rounded-lg" />
        ) : (
          <>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent truncate">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {cardContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-popover border border-border shadow-lg">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-lg font-bold text-primary">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {tooltip && <div className="text-xs text-muted-foreground mt-1 max-w-xs">{tooltip}</div>}
        {trend && (
          <div className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
