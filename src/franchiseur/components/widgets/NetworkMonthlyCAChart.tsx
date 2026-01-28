import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface NetworkMonthlyCAChartProps {
  data: Array<{
    month: string;
    ca: number;
    nbFactures: number;
  }>;
}

// Palette de couleurs douces et pâles pour les barres
const BAR_COLORS = [
  '#93c5fd', // blue-300
  '#67e8f9', // cyan-300
  '#6ee7b7', // emerald-300
  '#86efac', // green-300
  '#bef264', // lime-300
  '#fde047', // yellow-300
  '#fdba74', // orange-300
  '#fca5a5', // red-300
  '#f9a8d4', // pink-300
  '#c4b5fd', // purple-300
  '#a5b4fc', // indigo-300
  '#c4b5fd', // violet-300
];

export const NetworkMonthlyCAChart = ({ data }: NetworkMonthlyCAChartProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-sm p-6"
    >
      {/* Decorative gradient - plus subtil */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-200/20 to-cyan-200/10 rounded-bl-[100px] -mr-10 -mt-10" />
      
      <div className="mb-6 relative flex items-center gap-3">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-md"
        >
          <TrendingUp className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Évolution du CA
          </h3>
          <p className="text-sm text-muted-foreground">Répartition mensuelle du réseau</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-card border-0 shadow-2xl p-4 rounded-xl"
                  >
                    <p className="font-bold text-foreground mb-2">{data.month}</p>
                    <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                      {formatEuros(data.ca)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.nbFactures} facture{data.nbFactures > 1 ? 's' : ''}
                    </p>
                  </motion.div>
                );
              }
              return null;
            }}
            cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 8 }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Bar 
            dataKey="ca" 
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Bottom accent - plus subtil */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300" />
    </motion.div>
  );
};
