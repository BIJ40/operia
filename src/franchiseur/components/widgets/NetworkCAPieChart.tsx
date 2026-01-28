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

// Palette vibrante arc-en-ciel
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#22c55e', // green
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
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-lg p-6"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-400/15 to-pink-500/10 rounded-bl-[100px] -mr-10 -mt-10" />
      
      <div className="mb-4 relative flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 45 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg"
        >
          <PieChartIcon className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">
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
      
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-pink-500 to-rose-400" />
    </motion.div>
  );
};