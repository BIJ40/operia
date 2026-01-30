/**
 * DiffusionUniversPage - Page Univers pour Diffusion TV
 * Tiles par univers + Graphique évolution CA
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { Layers, Wrench, Droplets, Zap, Flame, Thermometer, Wind, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDiffusionUniversStatia } from './useDiffusionUniversStatia';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DiffusionUniversPageProps {
  currentMonthIndex: number;
}

const UNIVERS_CONFIG: Record<string, { icon: typeof Layers; color: string }> = {
  'Plomberie': { icon: Droplets, color: 'hsl(199, 89%, 48%)' },
  'Électricité': { icon: Zap, color: 'hsl(48, 96%, 53%)' },
  'Chauffage': { icon: Flame, color: 'hsl(14, 100%, 57%)' },
  'Climatisation': { icon: Wind, color: 'hsl(199, 89%, 70%)' },
  'Serrurerie': { icon: Settings, color: 'hsl(271, 91%, 65%)' },
  'Menuiserie': { icon: Wrench, color: 'hsl(25, 95%, 53%)' },
  'Vitrerie': { icon: Layers, color: 'hsl(173, 80%, 40%)' },
  'Multi-travaux': { icon: Wrench, color: 'hsl(220, 70%, 50%)' },
  'default': { icon: Layers, color: 'hsl(220, 14%, 46%)' },
};

const getUniversConfig = (univers: string) => {
  const normalized = univers.toLowerCase();
  if (normalized.includes('plomb')) return UNIVERS_CONFIG['Plomberie'];
  if (normalized.includes('élec') || normalized.includes('elec')) return UNIVERS_CONFIG['Électricité'];
  if (normalized.includes('chauff')) return UNIVERS_CONFIG['Chauffage'];
  if (normalized.includes('clim')) return UNIVERS_CONFIG['Climatisation'];
  if (normalized.includes('serr')) return UNIVERS_CONFIG['Serrurerie'];
  if (normalized.includes('menu')) return UNIVERS_CONFIG['Menuiserie'];
  if (normalized.includes('vitr')) return UNIVERS_CONFIG['Vitrerie'];
  if (normalized.includes('multi') || normalized.includes('travaux')) return UNIVERS_CONFIG['Multi-travaux'];
  return UNIVERS_CONFIG['default'];
};

export const DiffusionUniversPage = ({ currentMonthIndex }: DiffusionUniversPageProps) => {
  const { data, isLoading } = useDiffusionUniversStatia(currentMonthIndex);

  const chartData = useMemo(() => {
    if (!data?.stats) return [];
    return data.stats.slice(0, 8).map(s => ({
      name: s.univers.length > 12 ? s.univers.slice(0, 12) + '...' : s.univers,
      fullName: s.univers,
      ca: s.caHT,
      color: getUniversConfig(s.univers).color,
    }));
  }, [data?.stats]);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 animate-pulse bg-muted/20 h-32 rounded-2xl" />
          ))}
        </div>
        <Card className="p-6 animate-pulse bg-muted/20 h-80 rounded-2xl" />
      </div>
    );
  }

  const { stats, caTotal, dossiersTotal } = data;

  return (
    <div className="space-y-6">
      {/* Tiles univers (top 6) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.slice(0, 6).map((stat) => {
          const config = getUniversConfig(stat.univers);
          const Icon = config.icon;
          const pct = caTotal > 0 ? (stat.caHT / caTotal) * 100 : 0;
          
          return (
            <Card
              key={stat.univers}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-border/30 p-4',
                'bg-gradient-to-br via-background to-background',
                'shadow-sm hover:shadow-md transition-all'
              )}
              style={{ 
                borderLeftWidth: 4, 
                borderLeftColor: config.color,
                background: `linear-gradient(135deg, ${config.color}10 0%, transparent 50%)`
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div 
                    className="rounded-full p-2 border"
                    style={{ backgroundColor: `${config.color}15`, borderColor: `${config.color}30` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: config.color }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <h3 className="text-xs font-medium text-muted-foreground truncate">
                  {stat.univers}
                </h3>
                <p className="text-lg font-bold text-foreground">{formatEuros(stat.caHT)}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{stat.nbDossiers} dossiers</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Graphique CA par univers + Résumé */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique barres */}
        <Card className="lg:col-span-2 p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-warm-purple" />
            <h3 className="text-lg font-semibold text-foreground">CA par Univers</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <XAxis 
                  type="number"
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip 
                  formatter={(value: number) => formatEuros(value)}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="ca" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Résumé global */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-6">Résumé Univers</h3>
          
          <div className="space-y-6">
            {/* CA Total */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">CA Total</p>
              <p className="text-3xl font-bold text-foreground">{formatEuros(caTotal)}</p>
            </div>

            {/* Dossiers */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Dossiers</p>
              <p className="text-2xl font-bold text-foreground">{dossiersTotal}</p>
            </div>

            {/* Panier moyen */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Panier moyen</p>
              <p className="text-2xl font-bold text-foreground">
                {formatEuros(dossiersTotal > 0 ? caTotal / dossiersTotal : 0)}
              </p>
            </div>

            {/* Univers actifs */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Univers actifs</p>
              <p className="text-2xl font-bold text-foreground">{stats.length}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
