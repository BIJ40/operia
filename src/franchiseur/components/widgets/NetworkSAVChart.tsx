import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface NetworkSAVChartProps {
  data: Array<{
    month: string;
    tauxSAV: number;
  }>;
}

export const NetworkSAVChart = ({ data }: NetworkSAVChartProps) => {
  return (
    <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Évolution du taux SAV
        </h3>
        <p className="text-sm text-muted-foreground">Taux moyen SAV réseau par mois</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
          />
          <YAxis 
            className="text-xs"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 border-2 border-primary p-3 rounded-lg shadow-xl z-50">
                    <p className="font-semibold mb-1 text-foreground">{data.month}</p>
                    <p className="text-sm text-primary font-bold">
                      {data.tauxSAV.toFixed(2)}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Line 
            type="monotone"
            dataKey="tauxSAV" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
