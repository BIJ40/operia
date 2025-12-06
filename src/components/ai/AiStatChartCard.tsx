/**
 * AI Stat Chart Card - Auto-generated charts for statistics
 * Renders line, bar, or horizontal ranking charts based on data
 */

import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartData } from './types';

interface AiStatChartCardProps {
  chart: ChartData;
  className?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AiStatChartCard({ chart, className }: AiStatChartCardProps) {
  const { type, title, data, unit } = chart;

  const formatValue = (value: number): string => {
    if (unit === '€' || unit === 'EUR') {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
        notation: 'compact',
      }).format(value);
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg px-3 py-2 text-sm">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-primary">{formatValue(payload[0].value)}</p>
      </div>
    );
  };

  if (type === 'line') {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h4 className="font-medium text-foreground">{title}</h4>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                className="text-muted-foreground"
                tickFormatter={formatValue}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'bar' || type === 'ranking') {
    // Horizontal bar for ranking, vertical for others
    const isHorizontal = type === 'ranking' || data.length <= 6;
    
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h4 className="font-medium text-foreground">{title}</h4>
        </div>
        <div className={cn("", isHorizontal ? "h-auto" : "h-48")}>
          {isHorizontal ? (
            <div className="space-y-2">
              {data.slice(0, 10).map((item, idx) => {
                const maxValue = Math.max(...data.map(d => d.value));
                const percentage = (item.value / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                      idx === 1 ? 'bg-slate-400 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{item.name}</span>
                        <span className="text-sm font-semibold text-primary ml-2">{formatValue(item.value)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  className="text-muted-foreground"
                  tickLine={false}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  tickFormatter={formatValue}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }

  return null;
}
