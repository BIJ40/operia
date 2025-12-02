/**
 * STATiA-BY-BIJ - Composant de visualisation de métriques
 * 
 * Affiche automatiquement le bon type de visualisation selon les données.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { VisualizationData } from '../engine/metricEngine';

// ============================================
// TYPES
// ============================================

interface MetricVisualizationProps {
  data: VisualizationData;
  title?: string;
  className?: string;
  height?: number;
}

// ============================================
// COULEURS
// ============================================

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00C49F',
];

// ============================================
// FORMATAGE
// ============================================

function formatValue(value: number, unit?: string): string {
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M${unit ? ` ${unit}` : ''}`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k${unit ? ` ${unit}` : ''}`;
  }
  
  return `${Number.isInteger(value) ? value : value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
}

// ============================================
// COMPOSANTS DE VISUALISATION
// ============================================

function SingleValueDisplay({ data }: { data: VisualizationData }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <span className="text-5xl font-bold text-primary">
        {formatValue(data.value ?? 0, data.unit)}
      </span>
      {data.unit && (
        <span className="text-sm text-muted-foreground mt-2">
          {data.unit === '%' ? 'Pourcentage' : data.unit}
        </span>
      )}
    </div>
  );
}

function BarChartDisplay({ data, height = 300 }: { data: VisualizationData; height?: number }) {
  const chartData = data.labels?.map((label, i) => ({
    name: label,
    value: data.series?.[0]?.data[i] ?? 0,
    ...data.series?.slice(1).reduce((acc, serie) => ({
      ...acc,
      [serie.name]: serie.data[i] ?? 0,
    }), {}),
  })) || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => formatValue(v, data.unit)}
          className="text-muted-foreground"
        />
        <Tooltip 
          formatter={(value: number) => formatValue(value, data.unit)}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {data.series && data.series.length > 1 ? (
          data.series.map((serie, i) => (
            <Bar 
              key={serie.name}
              dataKey={serie.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))
        ) : (
          <Bar 
            dataKey="value" 
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartDisplay({ data, height = 300 }: { data: VisualizationData; height?: number }) {
  const chartData = data.labels?.map((label, i) => ({
    name: label,
    value: data.series?.[0]?.data[i] ?? 0,
    ...data.series?.slice(1).reduce((acc, serie) => ({
      ...acc,
      [serie.name]: serie.data[i] ?? 0,
    }), {}),
  })) || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => formatValue(v, data.unit)}
          className="text-muted-foreground"
        />
        <Tooltip 
          formatter={(value: number) => formatValue(value, data.unit)}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {data.series && data.series.length > 1 ? (
          data.series.map((serie, i) => (
            <Line 
              key={serie.name}
              type="monotone"
              dataKey={serie.name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))
        ) : (
          <Line 
            type="monotone"
            dataKey="value" 
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartDisplay({ data, height = 300 }: { data: VisualizationData; height?: number }) {
  const chartData = data.labels?.map((label, i) => ({
    name: label,
    value: data.series?.[0]?.data[i] ?? 0,
  })) || [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => formatValue(value, data.unit)}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TableDisplay({ data }: { data: VisualizationData }) {
  if (!data.labels || !data.series) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium">Dimension</th>
            {data.series.map(serie => (
              <th key={serie.name} className="text-right p-2 font-medium">
                {serie.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.labels.map((label, i) => (
            <tr key={label} className="border-b border-border/50 hover:bg-muted/50">
              <td className="p-2">{label}</td>
              {data.series?.map(serie => (
                <td key={serie.name} className="text-right p-2 font-mono">
                  {formatValue(serie.data[i] ?? 0, data.unit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function MetricVisualization({ 
  data, 
  title,
  className = '',
  height = 300,
}: MetricVisualizationProps) {
  const renderVisualization = () => {
    switch (data.recommendedChart) {
      case 'number':
        return <SingleValueDisplay data={data} />;
      case 'bar':
        return <BarChartDisplay data={data} height={height} />;
      case 'line':
        return <LineChartDisplay data={data} height={height} />;
      case 'pie':
        return <PieChartDisplay data={data} height={height} />;
      case 'table':
        return <TableDisplay data={data} />;
      default:
        // Choix automatique selon les données
        if (data.type === 'single' || !data.labels?.length) {
          return <SingleValueDisplay data={data} />;
        }
        if (data.labels.length <= 5) {
          return <PieChartDisplay data={data} height={height} />;
        }
        return <BarChartDisplay data={data} height={height} />;
    }
  };

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {data.recommendedChart}
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {renderVisualization()}
      </CardContent>
    </Card>
  );
}

export default MetricVisualization;
