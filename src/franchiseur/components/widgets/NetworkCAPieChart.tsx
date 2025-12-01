import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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
  'hsl(220, 70%, 30%)',
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
    <div className="group relative rounded-xl border border-helpconfort-blue/15 p-6
      bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
      shadow-sm transition-all duration-300 border-l-4 border-l-helpconfort-blue
      hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-0.5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-helpconfort-blue">
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
    </div>
  );
};