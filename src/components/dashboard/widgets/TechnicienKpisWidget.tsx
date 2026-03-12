/**
 * Widget KPIs pour technicien - Affiche les statistiques personnelles
 */

import { usePersonalKpis } from '@/hooks/usePersonalKpis';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { Wrench, FolderCheck, Clock, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const TECH_KPIS = [
  { 
    key: 'caMonth', 
    label: 'Mon CA du mois', 
    icon: TrendingUp,
    format: 'currency',
    color: 'from-green-500 to-green-600'
  },
  { 
    key: 'dossiersTraites', 
    label: 'Dossiers terminés', 
    icon: FolderCheck,
    format: 'number',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    key: 'interventionsRealisees', 
    label: 'Rendez-Vous', 
    icon: Wrench,
    format: 'number',
    color: 'from-orange-500 to-orange-600'
  },
];

function formatValue(value: number | undefined, format: string): string {
  if (value === undefined || value === null) return '–';
  
  switch (format) {
    case 'currency':
      return formatEuros(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'hours':
      return `${value}h`;
    case 'number':
    default:
      return value.toLocaleString('fr-FR');
  }
}

export function TechnicienKpisWidget() {
  const { data, isLoading, error } = usePersonalKpis();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
        {TECH_KPIS.map((kpi) => (
          <Skeleton key={kpi.key} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
        Erreur de chargement
      </div>
    );
  }

  if (data.type === 'not_linked') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm gap-2 p-4">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-center">Votre compte n'est pas encore lié à Apogée.</p>
        <p className="text-xs text-center">Contactez votre responsable pour activer vos statistiques.</p>
      </div>
    );
  }

  if (data.type !== 'technicien') {
    return (
      <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
        Ce widget est réservé aux techniciens
      </div>
    );
  }

  const kpis = data.data;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
      {TECH_KPIS.map((kpi) => {
        const Icon = kpi.icon;
        const value = kpis[kpi.key as keyof typeof kpis];
        
        return (
          <Card key={kpi.key} className="p-3 border hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${kpi.color} p-1.5 rounded text-white`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold">{formatValue(value, kpi.format)}</p>
          </Card>
        );
      })}
    </div>
  );
}
