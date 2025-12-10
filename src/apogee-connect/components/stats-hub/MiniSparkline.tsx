import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  color?: string;
}

const colorMap: Record<string, { stroke: string; fill: string }> = {
  primary: { stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary) / 0.2)' },
  blue: { stroke: 'hsl(210, 100%, 50%)', fill: 'hsl(210, 100%, 50%, 0.2)' },
  green: { stroke: 'hsl(142, 76%, 36%)', fill: 'hsl(142, 76%, 36%, 0.2)' },
  orange: { stroke: 'hsl(25, 95%, 53%)', fill: 'hsl(25, 95%, 53%, 0.2)' },
  purple: { stroke: 'hsl(271, 91%, 65%)', fill: 'hsl(271, 91%, 65%, 0.2)' },
  red: { stroke: 'hsl(0, 84%, 60%)', fill: 'hsl(0, 84%, 60%, 0.2)' },
};

export function MiniSparkline({ data, color = 'primary' }: MiniSparklineProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((value, index) => ({ value, index }));
  const colors = colorMap[color] || colorMap.primary;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.stroke}
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
