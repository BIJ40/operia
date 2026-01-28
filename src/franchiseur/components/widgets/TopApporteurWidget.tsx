import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, FileText, Sparkles } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { motion } from "framer-motion";

interface TopApporteurData {
  name: string;
  ca: number;
  nbDossiers: number;
  rank: number;
}

interface TopApporteurWidgetProps {
  apporteurs: TopApporteurData[];
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1: return { 
      gradient: "from-amber-400 to-yellow-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-300",
      emoji: "🥇"
    };
    case 2: return { 
      gradient: "from-slate-300 to-gray-400",
      bg: "bg-slate-50 dark:bg-slate-900/20",
      border: "border-slate-300",
      emoji: "🥈"
    };
    case 3: return { 
      gradient: "from-orange-400 to-amber-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-300",
      emoji: "🥉"
    };
    default: return { 
      gradient: "from-gray-200 to-gray-300",
      bg: "bg-gray-50 dark:bg-gray-900/20",
      border: "border-gray-200",
      emoji: `#${rank}`
    };
  }
};

export function TopApporteurWidget({ apporteurs }: TopApporteurWidgetProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-lg"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-500/10 rounded-bl-[80px] -mr-8 -mt-8" />
      
      <CardHeader className="pb-3 relative">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
          >
            <Users className="h-5 w-5 text-white" />
          </motion.div>
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Top Apporteurs
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {apporteurs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-2">
            {apporteurs.map((apporteur, index) => {
              const style = getRankStyle(apporteur.rank);
              return (
                <motion.div
                  key={apporteur.rank}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`p-3 rounded-xl border ${style.border} ${style.bg} transition-all cursor-default`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card shadow-md">
                      <span className="text-xl">{style.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{apporteur.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          <span className="font-medium text-emerald-600">{formatEuros(apporteur.ca)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {apporteur.nbDossiers} dossiers
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />
    </motion.div>
  );
}
