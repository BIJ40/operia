import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface NetworkMonthlyCAChartProps {
  data: Array<{
    month: string;
    ca: number;
    nbFactures: number;
  }>;
}

export const NetworkMonthlyCAChart = ({ data }: NetworkMonthlyCAChartProps) => {
  return (
    <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Évolution du CA sur l'année
        </h3>
        <p className="text-sm text-muted-foreground">Répartition mensuelle du chiffre d'affaires réseau</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
          />
          <YAxis 
            className="text-xs"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-800 border-2 border-primary p-3 rounded-lg shadow-xl z-50">
                    <p className="font-semibold mb-1 text-foreground">{data.month}</p>
                    <p className="text-sm text-primary font-bold">
                      {formatEuros(data.ca)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.nbFactures} facture{data.nbFactures > 1 ? 's' : ''}
                    </p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Bar 
            dataKey="ca" 
            fill="hsl(var(--primary))" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
