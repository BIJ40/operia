import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface NetworkCAPieChartProps {
  data: Array<{
    agencyLabel: string;
    ca: number;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--helpconfort-blue-dark))',
  'hsl(var(--accent))',
  'hsl(200, 80%, 50%)',
  'hsl(180, 70%, 45%)',
  'hsl(160, 60%, 40%)',
  'hsl(140, 50%, 35%)',
  'hsl(120, 40%, 30%)',
];

export const NetworkCAPieChart = ({ data }: NetworkCAPieChartProps) => {
  // Take top 8 agencies and group the rest
  const topAgencies = data.slice(0, 7);
  const othersCA = data.slice(7).reduce((sum, a) => sum + a.ca, 0);
  
  const chartData = [
    ...topAgencies,
    ...(othersCA > 0 ? [{ agencyLabel: 'Autres', ca: othersCA }] : [])
  ];

  return (
    <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Part de marché CA par agence
        </h3>
        <p className="text-sm text-muted-foreground">Répartition du chiffre d'affaires réseau</p>
      </div>
      
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="ca"
            nameKey="agencyLabel"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(entry: any) => 
              `${entry.agencyLabel} ${(entry.percent * 100).toFixed(1)}%`
            }
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0];
                return (
                  <div className="bg-white dark:bg-gray-800 border-2 border-primary p-3 rounded-lg shadow-xl z-50">
                    <p className="font-semibold mb-1 text-foreground">{data.name}</p>
                    <p className="text-sm text-primary font-bold">
                      {formatEuros(data.value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
