import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Euro, Percent, Wrench } from "lucide-react";
import { ParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { formatEuros, formatPercent } from "@/apogee-connect/utils/formatters";
import { WidgetDialog } from "./WidgetDialog";

interface ParticuliersWidgetProps {
  stats: ParticuliersStats;
}

export const ParticuliersWidget = ({ stats }: ParticuliersWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const color = "hsl(var(--primary))";

  const StatsContent = ({ compact = false }: { compact?: boolean }) => (
    <div className="space-y-3">
      {/* En-tête avec nom du type */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold">Clients Directs</h4>
        </div>
        <p className="text-xs text-muted-foreground">(Particuliers)</p>
        <div className="text-left">
          <p className={compact ? "text-lg font-bold" : "text-2xl font-bold"} style={{ color }}>
            {formatEuros(stats?.caHT || 0)}
          </p>
          <p className="text-xs text-muted-foreground">CA HT</p>
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className={`grid grid-cols-2 ${compact ? 'gap-3 pt-3 border-t' : 'md:grid-cols-4 gap-4 pt-4 border-t'}`}>
        {/* Dossiers */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="bg-blue-500/10 p-1 rounded">
              <Package className="w-3 h-3 text-blue-500" />
            </div>
            <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>{stats?.nbDossiers || 0}</p>
          </div>
          <p className="text-xs text-muted-foreground">Dossiers</p>
        </div>

        {/* Panier moyen */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="bg-green-500/10 p-1 rounded">
              <Euro className="w-3 h-3 text-green-500" />
            </div>
            <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>{formatEuros(stats?.panierMoyen || 0)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Panier</p>
        </div>

        {/* Taux de transformation */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="bg-purple-500/10 p-1 rounded">
              <Percent className="w-3 h-3 text-purple-500" />
            </div>
            <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>
              {stats?.tauxTransformation !== null 
                ? formatPercent(stats?.tauxTransformation)
                : "--"
              }
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Transfo</p>
        </div>

        {/* Taux de SAV */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="bg-orange-500/10 p-1 rounded">
              <Wrench className="w-3 h-3 text-orange-500" />
            </div>
            <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>
              {stats?.tauxSAV !== null 
                ? formatPercent(stats?.tauxSAV)
                : "--"
              }
            </p>
          </div>
          <p className="text-xs text-muted-foreground">SAV</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer h-full"
        style={{ borderLeft: `4px solid ${color}` }}
        onClick={() => setIsDialogOpen(true)}
      >
        <CardContent className="p-4">
          <StatsContent compact={true} />
        </CardContent>
      </Card>

      <WidgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Clients Directs (Particuliers) - Détails complets"
        maxWidth="xl"
      >
        <Card style={{ borderLeft: `4px solid ${color}` }}>
          <CardContent className="p-6">
            <StatsContent compact={false} />
          </CardContent>
        </Card>
      </WidgetDialog>
    </>
  );
};
