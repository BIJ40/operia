import { LucideIcon } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ACCENT_THEMES, type AccentThemeKey } from "@/lib/accentThemes";

interface NetworkKpiTileProps {
  title: string;
  value: number | string | null;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
}

// Palette pastel tokenisée (alignée avec la couleur des onglets)
const THEME_KEYS: AccentThemeKey[] = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];

export function NetworkKpiTile({ title, value, icon: Icon, format = 'number', subtitle }: NetworkKpiTileProps) {
  // Couleur stable par titre
  const theme = useMemo(() => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const key = THEME_KEYS[hash % THEME_KEYS.length];
    return ACCENT_THEMES[key];
  }, [title]);

  const formattedValue = (() => {
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
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border/30 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Gradient overlay - plus doux */}
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${theme.gradient} opacity-10 rounded-bl-[50px] -mr-4 -mt-4 group-hover:opacity-15 transition-opacity`} />
      
      <div className="relative p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground/90 max-w-[65%]">{title}</p>
          <motion.div 
            whileHover={{ rotate: 10 }}
            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} opacity-80 flex items-center justify-center`}
          >
            <Icon className="h-4 w-4 text-primary-foreground" />
          </motion.div>
        </div>
        
        <div className={`text-2xl font-bold ${theme.text} opacity-90 mb-0.5`}>
          {formattedValue}
        </div>
        
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 truncate">
            <span className={`w-1 h-1 rounded-full ${theme.dot} opacity-70`} />
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Bottom accent line - plus subtil */}
      <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${theme.gradient} opacity-40`} />
    </motion.div>
  );
}
