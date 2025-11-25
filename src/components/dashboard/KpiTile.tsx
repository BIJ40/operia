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
  return (
    <Card className="border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-2 rounded-full bg-accent/20 cursor-help">
              <Icon className="h-5 w-5 text-accent" />
            </div>
          </TooltipTrigger>
          {tooltip && (
            <TooltipContent>
              <p className="max-w-xs text-xs">{tooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full rounded-lg" />
        ) : (
          <>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-2">
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
}
