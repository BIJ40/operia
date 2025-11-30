import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, FileText } from "lucide-react";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface TopApporteurData {
  name: string;
  ca: number;
  nbDossiers: number;
}

interface TopApporteurWidgetProps {
  apporteur: TopApporteurData | null;
}

export function TopApporteurWidget({ apporteur }: TopApporteurWidgetProps) {
  return (
    <div className="group relative rounded-xl border border-helpconfort-blue/15
      bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-helpconfort-blue flex items-center gap-2">
          <Users className="h-5 w-5" />
          Meilleur Apporteur
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!apporteur ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <p className="text-lg font-bold text-primary mb-1">{apporteur.name}</p>
              <p className="text-xs text-muted-foreground">Top performer du réseau</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">CA Total</p>
                </div>
                <p className="font-semibold text-primary">{formatEuros(apporteur.ca)}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Dossiers</p>
                </div>
                <p className="font-semibold text-primary">{apporteur.nbDossiers}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </div>
  );
}
