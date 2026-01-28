import { LucideIcon } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { useMemo } from "react";
import { motion } from "framer-motion";

interface NetworkKpiTileProps {
  title: string;
  value: number | string | null;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
}

// Palette de couleurs vibrantes et ludiques
const COLOR_THEMES = [
  { bg: 'from-blue-500 to-cyan-400', icon: 'bg-blue-600', text: 'text-blue-600' },
  { bg: 'from-emerald-500 to-teal-400', icon: 'bg-emerald-600', text: 'text-emerald-600' },
  { bg: 'from-violet-500 to-purple-400', icon: 'bg-violet-600', text: 'text-violet-600' },
  { bg: 'from-orange-500 to-amber-400', icon: 'bg-orange-600', text: 'text-orange-600' },
  { bg: 'from-pink-500 to-rose-400', icon: 'bg-pink-600', text: 'text-pink-600' },
  { bg: 'from-indigo-500 to-blue-400', icon: 'bg-indigo-600', text: 'text-indigo-600' },
];

export function NetworkKpiTile({ title, value, icon: Icon, format = 'number', subtitle }: NetworkKpiTileProps) {
  // Couleur stable par titre
  const theme = useMemo(() => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLOR_THEMES[hash % COLOR_THEMES.length];
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
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      {/* Gradient overlay */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${theme.bg} opacity-20 rounded-bl-[60px] -mr-6 -mt-6 group-hover:opacity-30 transition-opacity`} />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground max-w-[70%]">{title}</p>
          <motion.div 
            whileHover={{ rotate: 15 }}
            className={`w-10 h-10 rounded-xl ${theme.icon} flex items-center justify-center shadow-lg`}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
        </div>
        
        <div className={`text-3xl font-bold ${theme.text} mb-1`}>
          {formattedValue}
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${theme.icon}`} />
            {subtitle}
          </p>
        )}
      </div>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.bg}`} />
    </motion.div>
  );
}
