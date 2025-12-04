import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { useMemo } from "react";

interface NetworkKpiTileProps {
  title: string;
  value: number | string | null;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
}

// 4 variantes de dégradé radial (coins différents)
const GRADIENT_VARIANTS = [
  "bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]",
  "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]",
  "bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))]",
  "bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))]",
];

export function NetworkKpiTile({ title, value, icon: Icon, format = 'number', subtitle }: NetworkKpiTileProps) {
  // Gradient aléatoire stable par titre
  const gradientClass = useMemo(() => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return GRADIENT_VARIANTS[hash % GRADIENT_VARIANTS.length];
  }, [title]);

  const formattedValue = (() => {
    // IMPORTANT: Si null, afficher "–" au lieu de 0
    if (value === null || value === undefined) return '–';
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
    <div className={`group relative rounded-xl border border-helpconfort-blue/15 p-4
      ${gradientClass} from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="w-8 h-8 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-helpconfort-blue/10 group-hover:border-helpconfort-blue transition-all">
          <Icon className="h-4 w-4 text-helpconfort-blue" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {formattedValue}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
