import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TypeApporteurStats } from "@/apogee-connect/utils/typesApporteursCalculations";
import { formatEuros, formatPercent } from "@/apogee-connect/utils/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Package, Euro, Percent, Wrench, Maximize2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetDialog } from "./WidgetDialog";

interface TypesApporteursWidgetProps {
  data: TypeApporteurStats[];
  loading?: boolean;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const TypesApporteursWidget = ({ data, loading }: TypesApporteursWidgetProps) => {
  const [selectedType, setSelectedType] = useState<TypeApporteurStats | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Par type d'apporteur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée disponible pour cette période</p>
        </CardContent>
      </Card>
    );
  }

  // Préparer les données pour le graphique
  const chartData = data.map((stat, index) => ({
    name: stat.type,
    value: stat.caHT,
    fill: COLORS[index % COLORS.length]
  }));

  const TypeCard = ({ stat, index, compact = false }: { stat: TypeApporteurStats; index: number; compact?: boolean }) => (
    <Card 
      key={stat.type}
      className="hover:shadow-lg transition-shadow cursor-pointer h-full"
      style={{ borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}
      onClick={() => setSelectedType(stat)}
    >
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-3">
          {/* En-tête avec nom du type */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold truncate flex-1" title={stat.type}>{stat.type}</h4>
              {compact && (
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedType(stat); }}>
                  <Maximize2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Type d'apporteur</p>
            <div className="text-left">
              <p className={compact ? "text-lg font-bold" : "text-2xl font-bold"} style={{ color: COLORS[index % COLORS.length] }}>
                {formatEuros(stat.caHT)}
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
                <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>{stat.nbDossiers}</p>
              </div>
              <p className="text-xs text-muted-foreground">Dossiers</p>
            </div>

            {/* Panier moyen */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="bg-green-500/10 p-1 rounded">
                  <Euro className="w-3 h-3 text-green-500" />
                </div>
                <p className={compact ? "text-sm font-semibold" : "text-lg font-semibold"}>{formatEuros(stat.panierMoyen)}</p>
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
                  {stat.tauxTransformation !== null 
                    ? formatPercent(stat.tauxTransformation)
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
                  {stat.tauxSAV !== null 
                    ? formatPercent(stat.tauxSAV)
                    : "--"
                  }
                </p>
              </div>
              <p className="text-xs text-muted-foreground">SAV</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Titre de la section */}
      <div>
        <h3 className="text-xl font-bold">Par type d'apporteur</h3>
        <p className="text-sm text-muted-foreground">
          Répartition et performances par type (assurance, gestion locative, syndic, etc.)
        </p>
      </div>

      {/* Graphique global */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Répartition du CA par type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                className="text-xs"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
              />
              <Tooltip 
                formatter={(value: number) => formatEuros(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grille compacte avec cartes cliquables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((stat, index) => (
          <TypeCard key={stat.type} stat={stat} index={index} compact={true} />
        ))}
      </div>

      {/* Dialog pour afficher les détails complets */}
      {selectedType && (
        <WidgetDialog
          open={!!selectedType}
          onOpenChange={(open) => !open && setSelectedType(null)}
          title={`Détails - ${selectedType.type}`}
          maxWidth="xl"
        >
          <TypeCard 
            stat={selectedType} 
            index={data.findIndex(d => d.type === selectedType.type)} 
            compact={false} 
          />
        </WidgetDialog>
      )}
    </div>
  );
};
