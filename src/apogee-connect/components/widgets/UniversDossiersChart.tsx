import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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
  const [animationKey, setAnimationKey] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Prepare chart data
  const chartData = universes
    .map((u) => ({
      name: u.label,
      value: data[u.slug] || 0,
      color: u.colorHex,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalDossiers = chartData.reduce((sum, d) => sum + d.value, 0);

  // Animation every 5 seconds for bar chart
  useEffect(() => {
    if (loading || chartData.length === 0) return;
    
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [loading, chartData.length]);

  if (loading || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Nombre de dossiers par univers
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

  const hoveredData = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
        <p className="font-medium text-sm" style={{ color: data.color }}>{data.name}</p>
        <p className="text-xs text-muted-foreground">{data.value} dossiers ({((data.value / totalDossiers) * 100).toFixed(1)}%)</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Nombre de dossiers par univers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total : {totalDossiers} dossiers
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Interactive Donut Chart */}
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke={hoveredIndex === index ? entry.color : 'transparent'}
                      strokeWidth={hoveredIndex === index ? 3 : 0}
                      style={{
                        transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center',
                        transition: 'all 0.2s ease-out',
                        filter: hoveredIndex === index ? `drop-shadow(0 0 8px ${entry.color}50)` : 'none'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {hoveredData ? (
                  <>
                    <p className="text-lg font-bold" style={{ color: hoveredData.color }}>{hoveredData.value}</p>
                    <p className="text-xs text-muted-foreground">{hoveredData.name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold">{totalDossiers}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Animated Horizontal Bar Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                key={animationKey}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
