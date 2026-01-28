import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Medal, Trophy, Crown } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { motion } from "framer-motion";

interface AgencyRanking {
  agencyId: string;
  agencyLabel: string;
  ca: number;
  rank: number;
}

interface TopAgenciesWidgetProps {
  agencies: AgencyRanking[];
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1: return { 
      bg: "bg-gradient-to-r from-amber-400 to-yellow-500", 
      text: "text-white",
      icon: Crown,
      shadow: "shadow-amber-200"
    };
    case 2: return { 
      bg: "bg-gradient-to-r from-slate-300 to-gray-400", 
      text: "text-white",
      icon: Medal,
      shadow: "shadow-gray-200"
    };
    case 3: return { 
      bg: "bg-gradient-to-r from-orange-400 to-amber-500", 
      text: "text-white",
      icon: Medal,
      shadow: "shadow-orange-200"
    };
    default: return { 
      bg: "bg-muted", 
      text: "text-muted-foreground",
      icon: Medal,
      shadow: ""
    };
  }
};

export function TopAgenciesWidget({ agencies }: TopAgenciesWidgetProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-lg"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/10 rounded-bl-[80px] -mr-8 -mt-8" />
      
      <CardHeader className="pb-3 relative">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <motion.div 
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
          >
            <Trophy className="h-5 w-5 text-white" />
          </motion.div>
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            TOP 5 Agences
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {agencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        ) : (
          <div className="space-y-2">
            {agencies.map((agency, index) => {
              const style = getRankStyle(agency.rank);
              const RankIcon = style.icon;
              return (
                <motion.div
                  key={agency.agencyId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-default ${style.shadow}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center ${style.shadow} shadow-md`}>
                      <RankIcon className={`h-4 w-4 ${style.text}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agency.agencyLabel}</p>
                      <p className="text-xs text-muted-foreground">Rang #{agency.rank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatEuros(agency.ca)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
    </motion.div>
  );
}
