import { Card } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, Users, PieChart } from "lucide-react";

export const ApporteursSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tableau de bord Apporteurs</h2>

      {/* Grille de 5 tuiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tuile 1: Top Apporteurs */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-bold">Top Apporteurs</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total CA HT</span>
              <span className="font-bold text-primary">125 450 €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="font-semibold">24</span>
            </div>
          </div>
        </Card>

        {/* Tuile 2: Taux de transformation */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-success" />
            <h3 className="text-lg font-bold">Taux de transformation</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Moyen</span>
              <span className="font-bold text-success">68%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Devis gagnés</span>
              <span className="font-semibold">145 / 213</span>
            </div>
          </div>
        </Card>

        {/* Tuile 3: Flop Apporteurs */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-destructive" />
            <h3 className="text-lg font-bold">Flop Apporteurs</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">CA HT le plus faible</span>
              <span className="font-bold text-destructive">1 250 €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="font-semibold">8</span>
            </div>
          </div>
        </Card>

        {/* Tuile 4: Types d'apporteurs */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-bold">Types d'apporteurs</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Syndics</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Agences</span>
              <span className="font-semibold">8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Autres</span>
              <span className="font-semibold">4</span>
            </div>
          </div>
        </Card>

        {/* Tuile 5: Répartition CA */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-bold">Répartition CA</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Apporteurs</span>
              <span className="font-bold text-primary">72%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Clients directs</span>
              <span className="font-semibold">28%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
