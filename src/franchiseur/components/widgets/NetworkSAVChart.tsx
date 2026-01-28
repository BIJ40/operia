import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface NetworkSAVChartProps {
  data: Array<{
    month: string;
    tauxSAV: number;
  }>;
}

export const NetworkSAVChart = ({ data }: NetworkSAVChartProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-card border-0 shadow-sm p-6"
    >
      {/* Decorative gradient - plus subtil */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-200/20 to-red-200/10 rounded-bl-[100px] -mr-10 -mt-10" />
      
      <div className="mb-6 relative flex items-center gap-3">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-md"
        >
          <AlertTriangle className="h-5 w-5 text-white" />
        </motion.div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Évolution SAV
          </h3>
          <p className="text-sm text-muted-foreground">Taux moyen mensuel du réseau</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="savGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#fdba74" stopOpacity={0} />
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
            tickFormatter={(value) => `${value.toFixed(0)}%`}
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
                    <p className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      {data.tauxSAV.toFixed(2)}%
                    </p>
                  </motion.div>
                );
              }
              return null;
            }}
            cursor={{ stroke: '#f97316', strokeWidth: 2 }}
            wrapperStyle={{ zIndex: 100 }}
          />
          <Area 
            type="monotone"
            dataKey="tauxSAV" 
            stroke="#fdba74" 
            strokeWidth={2}
            fill="url(#savGradient)"
            dot={{ fill: '#fdba74', r: 3, strokeWidth: 2, stroke: 'white' }}
            activeDot={{ r: 5, fill: '#fb923c' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Bottom accent - plus subtil */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-300 via-red-300 to-rose-300" />
    </motion.div>
  );
};
