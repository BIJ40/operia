import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface AnimatedAreaChartProps {
  data: Array<{ mois: string; ca: number }>;
  animationInterval?: number; // ms between redraws
}

export function AnimatedAreaChart({ data, animationInterval = 5000 }: AnimatedAreaChartProps) {
  const [animationKey, setAnimationKey] = useState(0);

  // Redraw every X seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey(prev => prev + 1);
    }, animationInterval);

    return () => clearInterval(interval);
  }, [animationInterval]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} key={animationKey}>
        <defs>
          <linearGradient id={`colorCA-${animationKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="mois" className="text-xs" />
        <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} className="text-xs" />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), 'CA HT']}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="ca" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          fillOpacity={1} 
          fill={`url(#colorCA-${animationKey})`}
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
