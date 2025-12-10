import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { MonthlyUniversCA } from "@/apogee-connect/utils/universCalculations";
import { Skeleton } from "@/components/ui/skeleton";

interface UniversStackedChartProps {
  data: MonthlyUniversCA[];
  universes: Array<{ slug: string; label: string; colorHex: string }>;
  loading?: boolean;
}

export const UniversStackedChart = ({ data, universes, loading }: UniversStackedChartProps) => {
  const [animationKey, setAnimationKey] = useState(0);

  // Redraw animation every 10 seconds
  useEffect(() => {
    if (loading || data.length === 0) return;
    
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [loading, data.length]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Évolution du CA par univers</CardTitle>
          <CardDescription>Répartition mensuelle du chiffre d'affaires</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
    return `${Math.round(value)}€`;
  };

  // Calculer le total CA
  const totalCA = data.reduce((sum, month) => {
    const monthTotal = universes.reduce((monthSum, u) => {
      return monthSum + (Number(month[u.slug]) || 0);
    }, 0);
    return sum + monthTotal;
  }, 0);

  // Trier les univers par CA total décroissant
  const sortedUniverses = [...universes].sort((a, b) => {
    const totalA = data.reduce((sum, month) => sum + (Number(month[a.slug]) || 0), 0);
    const totalB = data.reduce((sum, month) => sum + (Number(month[b.slug]) || 0), 0);
    return totalB - totalA;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1">
          {payload.reverse().map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-border flex justify-between text-xs font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
          Évolution du CA par univers
        </CardTitle>
        <CardDescription>
          Répartition mensuelle du chiffre d'affaires • Total : {formatCurrency(totalCA)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} key={animationKey}>
            <defs>
              {sortedUniverses.map((universe) => (
                <linearGradient key={universe.slug} id={`color-${universe.slug}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={universe.colorHex} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={universe.colorHex} stopOpacity={0.3}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
            {sortedUniverses.map((universe) => (
              <Area
                key={universe.slug}
                type="monotone"
                dataKey={universe.slug}
                name={universe.label}
                stackId="1"
                stroke={universe.colorHex}
                fill={`url(#color-${universe.slug})`}
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
