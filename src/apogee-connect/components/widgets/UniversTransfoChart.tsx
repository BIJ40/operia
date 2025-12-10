import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface UniversTransfoChartProps {
  data: Record<string, { caDevis: number; caFactures: number; tauxTransfo: number }>;
  universes: Array<{ slug: string; label: string; colorHex: string }>;
  loading?: boolean;
}

export const UniversTransfoChart = ({
  data,
  universes,
  loading,
}: UniversTransfoChartProps) => {
  const [animationKey, setAnimationKey] = useState(0);

  // Prepare chart data
  const chartData = universes
    .map((u) => ({
      name: u.label,
      caDevis: data[u.slug]?.caDevis || 0,
      caFactures: data[u.slug]?.caFactures || 0,
      tauxTransfo: data[u.slug]?.tauxTransfo || 0,
      color: u.colorHex,
    }))
    .filter((d) => d.caDevis > 0 || d.caFactures > 0)
    .sort((a, b) => b.tauxTransfo - a.tauxTransfo);

  // Animation every 10 seconds - bars fill from bottom
  useEffect(() => {
    if (loading || chartData.length === 0) return;
    
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [loading, chartData.length]);

  if (loading || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
            Taux de transformation par univers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {loading ? "Chargement..." : "Aucune donnée disponible"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
          Taux de transformation par univers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          CA facturé vs CA devis acceptés
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Animated Bar Chart */}
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} key={animationKey}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatEuros(value)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Taux transformation") {
                    return [`${value.toFixed(1)}%`, name];
                  }
                  return [formatEuros(value), name];
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Bar
                yAxisId="left"
                dataKey="caDevis"
                name="CA Devis"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
                animationBegin={0}
              />
              <Bar
                yAxisId="left"
                dataKey="caFactures"
                name="CA Facturé"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
                animationBegin={200}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar
                yAxisId="right"
                dataKey="tauxTransfo"
                name="Taux transformation"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
                animationBegin={400}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Compact summary table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Univers</th>
                  <th className="p-2 text-right">CA Devis</th>
                  <th className="p-2 text-right">CA Facturé</th>
                  <th className="p-2 text-right">Taux</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="border-t hover:bg-muted/50">
                    <td className="p-2 font-medium" style={{ color: item.color }}>
                      {item.name}
                    </td>
                    <td className="p-2 text-right">{formatEuros(item.caDevis)}</td>
                    <td className="p-2 text-right">{formatEuros(item.caFactures)}</td>
                    <td className="p-2 text-right font-semibold text-green-600">
                      {item.tauxTransfo.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
