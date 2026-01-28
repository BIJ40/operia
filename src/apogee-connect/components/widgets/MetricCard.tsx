import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  loading?: boolean;
}

export const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  className,
  loading 
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Card className={cn("hover:shadow-lg transition-shadow cursor-default", className)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </CardTitle>
              {Icon && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold truncate">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
              {trend && (
                <div className={cn(
                  "text-sm font-medium inline-flex items-center gap-1",
                  trend.isPositive ? "text-accent" : "text-destructive"
                )}>
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-popover border border-border shadow-lg">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-lg font-bold text-primary">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        {trend && (
          <div className={cn("text-xs", trend.isPositive ? "text-accent" : "text-destructive")}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
});
