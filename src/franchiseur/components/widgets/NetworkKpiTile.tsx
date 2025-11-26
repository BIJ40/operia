import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface NetworkKpiTileProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
}

export function NetworkKpiTile({ title, value, icon: Icon, format = 'number', subtitle }: NetworkKpiTileProps) {
  const formattedValue = (() => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return formatEuros(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString('fr-FR');
    }
  })();

  return (
    <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          {formattedValue}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
