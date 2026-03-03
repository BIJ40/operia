import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { UniversEntry } from '../../types/apporteur-stats-v2';

// recharts needs plain objects with index signature
type DonutEntry = { label: string; count: number; code: string; percentage: number; [key: string]: unknown };

const COLORS = [
  'hsl(var(--primary))',
  'hsl(215, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(35, 90%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(180, 50%, 45%)',
  'hsl(60, 70%, 50%)',
];

interface UniversDonutProps {
  data: UniversEntry[];
}

export function UniversDonut({ data }: UniversDonutProps) {
  if (!data || data.length === 0) return null;

  const chartData: DonutEntry[] = data.map(d => ({ ...d }));

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Répartition par univers
        </p>

        <div className="flex items-center gap-4">
          <div className="w-32 h-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Pie
                data={chartData as any}
                dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} dossiers`, name]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-1.5">
            {data.slice(0, 6).map((entry, i) => (
              <div key={entry.code} className="flex items-center gap-2 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-foreground truncate flex-1">{entry.label}</span>
                <span className="text-muted-foreground font-medium">{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
