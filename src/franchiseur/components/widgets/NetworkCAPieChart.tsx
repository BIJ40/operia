import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { motion } from "framer-motion";
import { PieChartIcon } from "lucide-react";

interface NetworkCAPieChartProps {
  data: Array<{
    agencyLabel: string;
    ca: number;
  }>;
}

// Palette douce pastel
const COLORS = [
  '#93c5fd', // blue-300
  '#6ee7b7', // emerald-300
  '#fcd34d', // amber-300
  '#fca5a5', // red-300
  '#c4b5fd', // violet-300
  '#67e8f9', // cyan-300
  '#f9a8d4', // pink-300
  '#86efac', // green-300
];

export const NetworkCAPieChart = ({ data }: NetworkCAPieChartProps) => {
  // Take top 7 agencies and group the rest
  const topAgencies = data.slice(0, 7);
  const othersCA = data.slice(7).reduce((sum, a) => sum + a.ca, 0);
  
  const chartData = [
    ...topAgencies,
    ...(othersCA > 0 ? [{ agencyLabel: 'Autres', ca: othersCA }] : [])
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-sm p-6"
    >
      {/* Decorative gradient - plus subtil */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-200/20 to-pink-200/10 rounded-bl-[100px] -mr-10 -mt-10" />
      
      <div className="mb-4 relative flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shadow-md"
        >
          <PieChartIcon className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Parts de marché
          </h3>
          <p className="text-sm text-muted-foreground">CA par agence</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="ca"
            nameKey="agencyLabel"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={(props) => {
              const { name, percent } = props as { name: string; percent: number };
              return `${name} ${(percent * 100).toFixed(0)}%`;
            }}
            labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
            animationDuration={1000}
          >
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0];
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-card border-0 shadow-2xl p-4 rounded-xl"
                  >
                    <p className="font-bold text-foreground mb-1">{data.name}</p>
                    <p className="text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
                      {formatEuros(data.value as number)}
                    </p>
                  </motion.div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Bottom accent - plus subtil */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-300 via-pink-300 to-rose-300" />
    </motion.div>
  );
};