import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface MonthlyCAChartProps {
  data: Array<{
    month: string;
    ca: number;
    nbFactures: number;
  }>;
}

export const MonthlyCAChart = ({ data }: MonthlyCAChartProps) => {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Chiffre d'affaires mensuel 2025</h3>
        <p className="text-sm text-muted-foreground">Répartition du CA par mois</p>
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
                  <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                    <p className="font-semibold mb-1">{data.month}</p>
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
