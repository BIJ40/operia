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
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-warm hover:shadow-warm-hover transition-shadow duration-300"
    >
      {/* Gradient overlay */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${theme.gradient} opacity-15 rounded-bl-[60px] -mr-6 -mt-6 group-hover:opacity-25 transition-opacity`} />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground max-w-[70%]">{title}</p>
          <motion.div 
            whileHover={{ rotate: 15 }}
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}
          >
            <Icon className="h-5 w-5 text-primary-foreground" />
          </motion.div>
        </div>
        
        <div className={`text-3xl font-bold ${theme.text} mb-1`}>
          {formattedValue}
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${theme.gradient}`} />
    </motion.div>
  );
}
