/**
 * TechnicianRadarChart - Radar individuel technicien
 * Axes: Productivité, SAV, Charge
 * Libellés non punitifs: "Zone de confort", "Zone de tension", "Zone d'optimisation"
 */

import { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { TechnicianPerformance } from '@/hooks/usePerformanceTerrain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface Props {
  technician: TechnicianPerformance;
  showCard?: boolean;
}

// Convertir les métriques en valeurs radar normalisées (0-100)
function normalizeForRadar(tech: TechnicianPerformance) {
  return [
    {
      metric: 'Productivité',
      value: Math.round(tech.productivityRate * 100),
      fullMark: 100,
      zone: tech.productivityZone,
    },
    {
      metric: 'Qualité',
      // Inverser: moins de SAV = mieux
      value: Math.round((1 - Math.min(tech.savRate, 0.2) / 0.2) * 100),
      fullMark: 100,
      zone: tech.savZone,
    },
    {
      metric: 'Équilibre charge',
      // Optimal autour de 100%, pénaliser extrêmes
      value: tech.loadRatio < 0.8 
        ? Math.round(tech.loadRatio / 0.8 * 100)
        : tech.loadRatio > 1.2
          ? Math.round((1 - (tech.loadRatio - 1.2) / 0.5) * 100)
          : 100,
      fullMark: 100,
      zone: tech.loadZone,
    },
  ];
}

function getZoneLabel(zone: string): string {
  switch (zone) {
    case 'optimal':
    case 'balanced':
      return 'Zone de confort';
    case 'warning':
      return 'Zone d\'optimisation';
    case 'critical':
    case 'overload':
    case 'underload':
      return 'Zone de tension';
    default:
      return zone;
  }
}

function getZoneColor(zone: string): string {
  switch (zone) {
    case 'optimal':
    case 'balanced':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'warning':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'critical':
    case 'overload':
    case 'underload':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function TechnicianRadarChart({ technician, showCard = true }: Props) {
  const radarData = useMemo(() => normalizeForRadar(technician), [technician]);

  const content = (
    <div className="space-y-4">
      {/* Header avec badges de zone */}
      <div className="flex items-center gap-2 flex-wrap">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: technician.color || 'hsl(var(--primary))' }}
        >
          <User className="w-4 h-4" />
        </div>
        <span className="font-medium">{technician.name}</span>
        <div className="flex-1" />
        <Badge variant="outline" className={getZoneColor(technician.productivityZone)}>
          {getZoneLabel(technician.productivityZone)}
        </Badge>
      </div>

      {/* Radar Chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name={technician.name}
              dataKey="value"
              stroke={technician.color || 'hsl(var(--primary))'}
              fill={technician.color || 'hsl(var(--primary))'}
              fillOpacity={0.3}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value}%`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-muted-foreground text-xs">Productivité</div>
          <div className="font-semibold">{Math.round(technician.productivityRate * 100)}%</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-muted-foreground text-xs">SAV</div>
          <div className="font-semibold">{technician.savCount}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="text-muted-foreground text-xs">Charge</div>
          <div className="font-semibold">{Math.round(technician.loadRatio * 100)}%</div>
        </div>
      </div>
    </div>
  );

  if (!showCard) return content;

  return (
    <Card>
      <CardContent className="pt-4">
        {content}
      </CardContent>
    </Card>
  );
}
