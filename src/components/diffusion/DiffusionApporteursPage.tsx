/**
 * DiffusionApporteursPage - Page Apporteurs pour Diffusion TV
 * Tiles par type d'apporteur + Graphique évolution par type
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { formatEuros, formatPercent } from '@/apogee-connect/utils/formatters';
import { Building2, Users, Home, Briefcase, TrendingUp, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDiffusionApporteursStatia } from './useDiffusionApporteursStatia';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DiffusionApporteursPageProps {
  currentMonthIndex: number;
}

const TYPE_CONFIG: Record<string, { icon: typeof Building2; color: string; bgColor: string }> = {
  'Assureurs': { icon: Building2, color: 'hsl(220, 70%, 50%)', bgColor: 'from-blue-500/10' },
  'Bailleurs': { icon: Home, color: 'hsl(142, 70%, 45%)', bgColor: 'from-green-500/10' },
  'Particuliers': { icon: Users, color: 'hsl(35, 90%, 55%)', bgColor: 'from-orange-500/10' },
  'Syndics': { icon: Briefcase, color: 'hsl(280, 70%, 50%)', bgColor: 'from-purple-500/10' },
  'Autres': { icon: FolderOpen, color: 'hsl(340, 70%, 50%)', bgColor: 'from-pink-500/10' },
};

const getTypeConfig = (type: string) => {
  // Match flexible sur le type
  const normalized = type.toLowerCase();
  if (normalized.includes('assur')) return TYPE_CONFIG['Assureurs'];
  if (normalized.includes('bailleur') || normalized.includes('social')) return TYPE_CONFIG['Bailleurs'];
  if (normalized.includes('particulier') || normalized.includes('direct')) return TYPE_CONFIG['Particuliers'];
  if (normalized.includes('syndic')) return TYPE_CONFIG['Syndics'];
  return TYPE_CONFIG['Autres'];
};

export const DiffusionApporteursPage = ({ currentMonthIndex }: DiffusionApporteursPageProps) => {
  const { data, isLoading } = useDiffusionApporteursStatia(currentMonthIndex);

  const chartColors = useMemo(() => {
    if (!data?.typeStats) return {};
    const colors: Record<string, string> = {};
    data.typeStats.forEach(t => {
      colors[t.type] = getTypeConfig(t.type).color;
    });
    return colors;
  }, [data?.typeStats]);

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

  const { typeStats, monthlyEvolution, segmentationPct } = data;

  return (
    <div className="space-y-6">
      {/* Tiles par type d'apporteur */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {typeStats.slice(0, 4).map((stat, idx) => {
          const config = getTypeConfig(stat.type);
          const Icon = config.icon;
          
          return (
            <Card
              key={stat.type}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-border/30 p-5',
                'bg-gradient-to-br via-background to-background',
                'shadow-sm hover:shadow-md transition-all',
                config.bgColor
              )}
              style={{ borderLeftWidth: 4, borderLeftColor: config.color }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {stat.type}
                  </h3>
                  <div 
                    className="rounded-full p-2 border"
                    style={{ backgroundColor: `${config.color}15`, borderColor: `${config.color}30` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: config.color }} />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{formatEuros(stat.caHT)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{stat.nbDossiers} dossiers</span>
                  <span>•</span>
                  <span>Transfo {formatPercent(stat.tauxTransfo)}</span>
                </div>
                {stat.tauxSav > 0 && (
                  <p className="text-xs text-orange-500">SAV {formatPercent(stat.tauxSav)}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Graphique évolution mensuelle par type + segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique évolution */}
        <Card className="lg:col-span-2 p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-warm-blue" />
            <h3 className="text-lg font-semibold text-foreground">Évolution CA par type</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatEuros(value)}
                  labelFormatter={(label) => `Mois: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {typeStats.map(t => (
                  <Area
                    key={t.type}
                    type="monotone"
                    dataKey={t.type}
                    stackId="1"
                    stroke={chartColors[t.type]}
                    fill={chartColors[t.type]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Segmentation Apporteurs vs Particuliers */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/30 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4">Segmentation</h3>
          
          <div className="space-y-6">
            {/* Apporteurs */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Apporteurs</span>
                <span className="font-bold text-foreground">{segmentationPct.apporteurs.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-warm-blue rounded-full transition-all"
                  style={{ width: `${segmentationPct.apporteurs}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatEuros(data.caApporteurs)}
              </p>
            </div>

            {/* Particuliers */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Particuliers</span>
                <span className="font-bold text-foreground">{segmentationPct.particuliers.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-warm-orange rounded-full transition-all"
                  style={{ width: `${segmentationPct.particuliers}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatEuros(data.caParticuliers)}
              </p>
            </div>

            {/* CA Total */}
            <div className="pt-4 border-t border-border/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">CA Total</span>
                <span className="text-xl font-bold text-foreground">
                  {formatEuros(data.caApporteurs + data.caParticuliers)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
