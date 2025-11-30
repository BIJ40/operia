import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Medal } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface AgencyRanking {
  agencyId: string;
  agencyLabel: string;
  ca: number;
  rank: number;
}

interface TopAgenciesWidgetProps {
  agencies: AgencyRanking[];
}

export function TopAgenciesWidget({ agencies }: TopAgenciesWidgetProps) {
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-500";
      case 2: return "text-gray-400";
      case 3: return "text-helpconfort-blue";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-white to-helpconfort-blue/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          TOP 5 Agences (CA)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-3">
            {agencies.map((agency) => (
              <div
                key={agency.agencyId}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Medal className={`h-5 w-5 ${getMedalColor(agency.rank)}`} />
                  <div>
                    <p className="font-medium">{agency.agencyLabel}</p>
                    <p className="text-xs text-muted-foreground">#{agency.rank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatEuros(agency.ca)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
