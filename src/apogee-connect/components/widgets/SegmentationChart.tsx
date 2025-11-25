import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MonthlySegmentData } from "@/apogee-connect/utils/segmentationCalculations";

interface SegmentationChartProps {
  data: MonthlySegmentData[];
  loading?: boolean;
}

export const SegmentationChart = ({ data, loading }: SegmentationChartProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value.toFixed(0)}€`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const particuliers = payload[0]?.value || 0;
      const apporteurs = payload[1]?.value || 0;
      const total = particuliers + apporteurs;
      const partPart = total > 0 ? ((particuliers / total) * 100).toFixed(1) : "0.0";
      const partApp = total > 0 ? ((apporteurs / total) * 100).toFixed(1) : "0.0";

      return (
        <div className="bg-white dark:bg-gray-800 border-2 border-primary rounded-lg shadow-xl p-3 z-50">
          <p className="font-semibold mb-2 text-foreground">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-muted-foreground">Particuliers:</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(particuliers)} ({partPart}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-muted-foreground">Apporteurs:</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(apporteurs)} ({partApp}%)
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground font-medium">Total:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  const totalCA = data.reduce((sum, d) => sum + d.totalCA, 0);
  const totalParticuliers = data.reduce((sum, d) => sum + d.caParticuliers, 0);
  const totalApporteurs = data.reduce((sum, d) => sum + d.caApporteurs, 0);
  const partGlobaleParticuliers = totalCA > 0 ? ((totalParticuliers / totalCA) * 100).toFixed(1) : "0.0";
  const partGlobaleApporteurs = totalCA > 0 ? ((totalApporteurs / totalCA) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Titre de la section */}
      <div>
        <h3 className="text-xl font-bold">Évolution CA : Particuliers vs Apporteurs</h3>
        <p className="text-sm text-muted-foreground">
          Répartition mensuelle du chiffre d'affaires par segment client
        </p>
      </div>

      <Card className="p-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Indicateurs globaux */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">CA Total Année</p>
              <p className="text-xl font-bold">{formatCurrency(totalCA)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-xs text-muted-foreground">Particuliers</p>
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalParticuliers)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{partGlobaleParticuliers}% du CA</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <p className="text-xs text-muted-foreground">Apporteurs</p>
              </div>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(totalApporteurs)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{partGlobaleApporteurs}% du CA</p>
            </div>
          </div>

          {/* Graphique */}
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} wrapperStyle={{ zIndex: 100 }} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => {
                    if (value === 'caParticuliers') return 'Particuliers';
                    if (value === 'caApporteurs') return 'Apporteurs';
                    return value;
                  }}
                />
                <Bar 
                  dataKey="caParticuliers" 
                  fill="hsl(221, 83%, 53%)" 
                  radius={[4, 4, 0, 0]}
                  name="caParticuliers"
                />
                <Bar 
                  dataKey="caApporteurs" 
                  fill="hsl(271, 91%, 65%)" 
                  radius={[4, 4, 0, 0]}
                  name="caApporteurs"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};
