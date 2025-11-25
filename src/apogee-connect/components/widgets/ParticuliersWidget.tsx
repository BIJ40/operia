import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Euro, ShoppingCart, TrendingUp, Wrench, Maximize2 } from "lucide-react";
import { ParticuliersStats } from "@/apogee-connect/utils/particuliersCalculations";
import { WidgetDialog } from "./WidgetDialog";

interface ParticuliersWidgetProps {
  stats: ParticuliersStats;
}

export const ParticuliersWidget = ({ stats }: ParticuliersWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "--";
    return `${value.toFixed(1)}%`;
  };

  const StatsContent = ({ compact = false }: { compact?: boolean }) => (
    <>
      <div className={compact ? "mb-4" : "mb-6"}>
        <div>
          <p className="text-sm text-muted-foreground">CA HT Total</p>
          <p className={compact ? "text-2xl font-bold" : "text-4xl font-bold"}>{formatCurrency(stats.caHT)}</p>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${compact ? 'gap-3' : 'md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
        <div className={`flex items-start gap-3 ${compact ? 'p-3' : 'p-4'} rounded-lg bg-blue-50 dark:bg-blue-950/20`}>
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Package className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Dossiers</p>
            <p className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>{stats.nbDossiers}</p>
          </div>
        </div>

        <div className={`flex items-start gap-3 ${compact ? 'p-3' : 'p-4'} rounded-lg bg-green-50 dark:bg-green-950/20`}>
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Euro className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Panier moyen</p>
            <p className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>{formatCurrency(stats.panierMoyen)}</p>
          </div>
        </div>

        <div className={`flex items-start gap-3 ${compact ? 'p-3' : 'p-4'} rounded-lg bg-purple-50 dark:bg-purple-950/20`}>
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <TrendingUp className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Taux transfo</p>
            <p className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>{formatPercent(stats.tauxTransformation)}</p>
          </div>
        </div>

        <div className={`flex items-start gap-3 ${compact ? 'p-3' : 'p-4'} rounded-lg bg-orange-50 dark:bg-orange-950/20`}>
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Wrench className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Taux SAV</p>
            <p className={compact ? "text-xl font-bold" : "text-2xl font-bold"}>{formatPercent(stats.tauxSAV)}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Clients Directs (Particuliers)</h3>
            <p className="text-sm text-muted-foreground">
              Statistiques des dossiers sans apporteur
            </p>
          </div>
        </div>

        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setIsDialogOpen(true)}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Aperçu rapide</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setIsDialogOpen(true); }}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
          <StatsContent compact={true} />
        </Card>
      </div>

      <WidgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Clients Directs (Particuliers) - Détails complets"
        maxWidth="xl"
      >
        <StatsContent compact={false} />
      </WidgetDialog>
    </>
  );
};
