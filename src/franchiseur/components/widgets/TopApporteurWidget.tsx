import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Medal, TrendingUp, FileText } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface TopApporteurData {
  name: string;
  ca: number;
  nbDossiers: number;
  rank: number;
}

interface TopApporteurWidgetProps {
  apporteurs: TopApporteurData[];
}

export function TopApporteurWidget({ apporteurs }: TopApporteurWidgetProps) {
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-500"; // Or
      case 2: return "text-gray-400";   // Argent
      case 3: return "text-amber-700";  // Bronze
      default: return "text-muted-foreground";
    }
  };

  const getMedalBg = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500/10 border-yellow-500/30";
      case 2: return "bg-gray-400/10 border-gray-400/30";
      case 3: return "bg-amber-700/10 border-amber-700/30";
      default: return "bg-muted/50 border-border";
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  return (
    <div className="group relative rounded-xl border border-helpconfort-blue/15
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-helpconfort-blue flex items-center gap-2">
          <Users className="h-5 w-5" />
          Top 3 Apporteurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {apporteurs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-3">
            {apporteurs.map((apporteur) => (
              <div
                key={apporteur.rank}
                className={`p-3 rounded-lg border transition-all ${getMedalBg(apporteur.rank)} hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background/80">
                    <span className="text-xl">{getRankLabel(apporteur.rank)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{apporteur.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatEuros(apporteur.ca)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {apporteur.nbDossiers} dossiers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </div>
  );
}
