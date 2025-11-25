import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DailyActivity } from "@/apogee-connect/utils/activityCalculations";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ActivityChartProps {
  data: DailyActivity[];
  variation: number;
  apporteurFilter?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border-2 border-cyan-500 rounded-lg p-3 shadow-lg">
        <p className="text-cyan-900 dark:text-cyan-100 font-semibold">{label}</p>
        <p className="text-cyan-700 dark:text-cyan-300">
          {payload[0].value} dossier{payload[0].value > 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export const ActivityChart = ({ data, variation, apporteurFilter }: ActivityChartProps) => {
  const isPositive = variation >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  console.log("📊 ActivityChart - données:", data);
  console.log("📊 ActivityChart - variation:", variation);
  
  return (
    <Card className="p-8 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border-2 border-cyan-200 dark:border-cyan-800 hover:scale-102 transition-all duration-300 cursor-pointer shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
            Activité entrante
          </h3>
          <p className="text-cyan-700 dark:text-cyan-300">Volume des 7 derniers jours</p>
          {apporteurFilter && (
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">
              Filtre: {apporteurFilter}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-1 text-lg font-semibold px-3 py-2 rounded-full ${
          isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
        }`}>
          <TrendIcon className="w-5 h-5" />
          <span>{Math.abs(variation)}%</span>
        </div>
      </div>
      
      <div className="h-64 bg-white/80 dark:bg-black/30 rounded-xl p-4">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fill: '#0e7490', fontSize: 12, fontWeight: 500 }}
                stroke="#0e7490"
                tickLine={{ stroke: '#0e7490' }}
              />
              <YAxis 
                tick={{ fill: '#0e7490', fontSize: 12, fontWeight: 500 }}
                stroke="#0e7490"
                tickLine={{ stroke: '#0e7490' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="dossiers" 
                fill="#06b6d4" 
                radius={[8, 8, 0, 0]}
                name="Dossiers"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-cyan-600 dark:text-cyan-400 text-lg">
              Aucune donnée disponible
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-cyan-600 dark:text-cyan-400">
          Variation vs moyenne 30 derniers jours
        </p>
      </div>
    </Card>
  );
};
