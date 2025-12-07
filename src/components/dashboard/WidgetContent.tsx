/**
 * WidgetContent - Contenu dynamique des widgets selon leur type
 */

import { UserWidget, WidgetTemplate } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetContentProps {
  widget: UserWidget & { template: WidgetTemplate };
}

// Mock data pour la démo
const MOCK_KPI_DATA: Record<string, { value: string; trend: number; label: string }> = {
  'StatIA.ca_global_ht': { value: '127 450 €', trend: 12.5, label: 'vs mois précédent' },
  'StatIA.taux_sav_global': { value: '3.2 %', trend: -0.8, label: 'vs mois précédent' },
  'StatIA.nb_dossiers_crees': { value: '89', trend: 5, label: 'vs mois précédent' },
};

const MOCK_LIST_DATA: Record<string, { items: { id: string; title: string; status: string; date: string }[] }> = {
  'Support.recent_tickets': {
    items: [
      { id: '1', title: 'Problème de connexion API', status: 'open', date: '10:32' },
      { id: '2', title: 'Export PDF ne fonctionne pas', status: 'pending', date: '09:15' },
      { id: '3', title: 'Question facturation', status: 'resolved', date: 'Hier' },
      { id: '4', title: 'Bug affichage planning', status: 'open', date: 'Hier' },
    ],
  },
  'RH.mes_demandes': {
    items: [
      { id: '1', title: 'Attestation employeur', status: 'pending', date: '05/12' },
      { id: '2', title: 'Bulletin novembre', status: 'completed', date: '01/12' },
    ],
  },
};

const MOCK_ALERTS: Record<string, { items: { id: string; title: string; severity: 'warning' | 'error' | 'info'; due: string }[] }> = {
  'Maintenance.echeances': {
    items: [
      { id: '1', title: 'CT Véhicule 234-ABC-75', severity: 'warning', due: 'Dans 5 jours' },
      { id: '2', title: 'Révision chaudière Client Martin', severity: 'info', due: 'Dans 2 semaines' },
    ],
  },
  'Tickets.pending': {
    items: [
      { id: '1', title: '3 tickets en attente de réponse', severity: 'warning', due: 'Depuis 2h' },
      { id: '2', title: '1 ticket SLA critique', severity: 'error', due: 'Depuis 30min' },
    ],
  },
};

const MOCK_CHART_DATA = {
  'StatIA.ca_par_technicien': [
    { name: 'Jean D.', value: 45000, color: 'hsl(var(--chart-1))' },
    { name: 'Marie L.', value: 38000, color: 'hsl(var(--chart-2))' },
    { name: 'Pierre M.', value: 32000, color: 'hsl(var(--chart-3))' },
    { name: 'Sophie B.', value: 28000, color: 'hsl(var(--chart-4))' },
  ],
  'StatIA.ca_par_univers': [
    { name: 'Plomberie', value: 55000, color: 'hsl(var(--chart-1))' },
    { name: 'Électricité', value: 35000, color: 'hsl(var(--chart-2))' },
    { name: 'Multi-technique', value: 25000, color: 'hsl(var(--chart-3))' },
  ],
};

export function WidgetContent({ widget }: WidgetContentProps) {
  const { type, module_source } = widget.template;

  switch (type) {
    case 'kpi':
      return <KPIWidget moduleSource={module_source} />;
    case 'chart':
      return <ChartWidget moduleSource={module_source} />;
    case 'list':
      return <ListWidget moduleSource={module_source} />;
    case 'alerts':
      return <AlertsWidget moduleSource={module_source} />;
    default:
      return <PlaceholderWidget />;
  }
}

function KPIWidget({ moduleSource }: { moduleSource: string }) {
  const data = MOCK_KPI_DATA[moduleSource];
  
  if (!data) return <PlaceholderWidget />;

  const TrendIcon = data.trend > 0 ? TrendingUp : data.trend < 0 ? TrendingDown : Minus;
  const trendColor = data.trend > 0 ? 'text-emerald-500' : data.trend < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-2">
      <div className="text-3xl font-bold text-foreground">{data.value}</div>
      <div className="flex items-center gap-2 text-sm">
        <TrendIcon className={cn('h-4 w-4', trendColor)} />
        <span className={trendColor}>{Math.abs(data.trend)}%</span>
        <span className="text-muted-foreground">{data.label}</span>
      </div>
    </div>
  );
}

function ChartWidget({ moduleSource }: { moduleSource: string }) {
  const data = MOCK_CHART_DATA[moduleSource as keyof typeof MOCK_CHART_DATA];
  
  if (!data) return <PlaceholderWidget />;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">{item.name}</span>
            <span className="text-muted-foreground">{((item.value / total) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${(item.value / total) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListWidget({ moduleSource }: { moduleSource: string }) {
  const data = MOCK_LIST_DATA[moduleSource];
  
  if (!data) return <PlaceholderWidget />;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      case 'pending': return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'resolved':
      case 'completed': return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-2">
      {data.items.map((item) => (
        <div 
          key={item.id} 
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
        >
          {getStatusIcon(item.status)}
          <span className="flex-1 text-sm truncate">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.date}</span>
        </div>
      ))}
    </div>
  );
}

function AlertsWidget({ moduleSource }: { moduleSource: string }) {
  const data = MOCK_ALERTS[moduleSource];
  
  if (!data) return <PlaceholderWidget />;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-2">
      {data.items.map((item) => (
        <div 
          key={item.id}
          className={cn(
            'flex items-start gap-2 p-2 rounded-lg border',
            getSeverityStyles(item.severity)
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs opacity-75">{item.due}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaceholderWidget() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60px] text-muted-foreground text-sm">
      Contenu à venir...
    </div>
  );
}
