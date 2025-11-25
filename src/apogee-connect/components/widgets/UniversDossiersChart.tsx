import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UniversDossiersChartProps {
  data: Record<string, number>;
  universes: Array<{ slug: string; label: string; colorHex: string }>;
  loading?: boolean;
}

export const UniversDossiersChart = ({
  data,
  universes,
  loading,
}: UniversDossiersChartProps) => {
  // Préparer les données pour les graphiques
  const chartData = universes
    .map((u) => ({
      name: u.label,
      value: data[u.slug] || 0,
      color: u.colorHex,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalDossiers = chartData.reduce((sum, d) => sum + d.value, 0);

  if (loading || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Nombre de dossiers par univers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            {loading ? "Chargement..." : "Aucune donnée disponible"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Nombre de dossiers par univers
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Total : {totalDossiers} dossiers
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pie">Camembert</TabsTrigger>
            <TabsTrigger value="bar">Histogramme</TabsTrigger>
          </TabsList>

          <TabsContent value="pie">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} dossiers`, "Nombre"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`${value} dossiers`, "Nombre"]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
