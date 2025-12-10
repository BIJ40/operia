import { Bar, BarChart, ResponsiveContainer } from 'recharts';

interface MiniBarProps {
  data: number[];
  color?: string;
}

const colorMap: Record<string, string> = {
  primary: 'hsl(var(--primary))',
  blue: 'hsl(210, 100%, 50%)',
  green: 'hsl(142, 76%, 36%)',
  orange: 'hsl(25, 95%, 53%)',
  purple: 'hsl(271, 91%, 65%)',
  red: 'hsl(0, 84%, 60%)',
};

export function MiniBar({ data, color = 'primary' }: MiniBarProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(-6).map((value, index) => ({ value, index }));
  const fillColor = colorMap[color] || colorMap.primary;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Bar
          dataKey="value"
          fill={fillColor}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
