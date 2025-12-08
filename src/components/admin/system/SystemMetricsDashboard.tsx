import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EdgeFunctionMonitor } from './EdgeFunctionMonitor';
import { DatabaseHealthPanel } from './DatabaseHealthPanel';
import { useEdgeFunctionSummary } from '@/hooks/useEdgeFunctionMetrics';
import { useDatabaseSummary } from '@/hooks/useDatabaseMetrics';
import { 
  Zap, 
  Database, 
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const REFRESH_OPTIONS = [
  { value: '15000', label: '15 secondes' },
  { value: '30000', label: '30 secondes' },
  { value: '60000', label: '1 minute' },
  { value: '0', label: 'Manuel' },
];

export function SystemMetricsDashboard() {
  const [activeTab, setActiveTab] = useState('edge-functions');
  const [refreshInterval, setRefreshInterval] = useState('30000');
  
  const { summary: efSummary, isLoading: efLoading } = useEdgeFunctionSummary();
  const { health: dbHealth, isLoading: dbLoading, refetch: refetchDb } = useDatabaseSummary();

  const overallStatus = (() => {
    if (efSummary.overallStatus === 'error' || dbHealth?.status === 'error') return 'error';
    if (efSummary.overallStatus === 'degraded' || dbHealth?.status === 'degraded') return 'degraded';
    return 'healthy';
  })();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy': return { icon: CheckCircle2, color: 'text-green-500', label: 'Tous les services opérationnels' };
      case 'degraded': return { icon: AlertTriangle, color: 'text-yellow-500', label: 'Services dégradés' };
      case 'error': return { icon: XCircle, color: 'text-destructive', label: 'Services en erreur' };
      default: return { icon: CheckCircle2, color: 'text-muted-foreground', label: 'Vérification...' };
    }
  };

  const statusConfig = getStatusConfig(overallStatus);
  const StatusIcon = statusConfig.icon;

  const handleExportMetrics = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      edgeFunctions: efSummary,
      database: dbHealth,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Métriques exportées');
  };

  const handleRefresh = () => {
    refetchDb();
    toast.success('Métriques actualisées');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn('h-6 w-6', statusConfig.color)} />
          <div>
            <h2 className="text-lg font-semibold">Monitoring Temps Réel</h2>
            <p className={cn('text-sm', statusConfig.color)}>{statusConfig.label}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Actualisation" />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={efLoading || dbLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', (efLoading || dbLoading) && 'animate-spin')} />
            Actualiser
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-helpconfort-blue/20 p-4 bg-gradient-to-br from-background to-helpconfort-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium">Edge Functions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{efSummary.healthyCount}</span>
            <span className="text-sm text-muted-foreground">/ {efSummary.totalFunctions} saines</span>
          </div>
        </div>
        
        <div className="rounded-xl border border-helpconfort-blue/20 p-4 bg-gradient-to-br from-background to-helpconfort-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium">Base de données</span>
          </div>
          <Badge variant="outline" className={cn(
            dbHealth?.status === 'healthy' && 'bg-green-500/10 text-green-600',
            dbHealth?.status === 'degraded' && 'bg-yellow-500/10 text-yellow-600',
            dbHealth?.status === 'error' && 'bg-destructive/10 text-destructive',
          )}>
            {dbHealth?.status === 'healthy' ? 'Opérationnelle' : 
             dbHealth?.status === 'degraded' ? 'Dégradée' : 'Erreur'}
          </Badge>
        </div>
        
        <div className="rounded-xl border border-border p-4 bg-gradient-to-br from-background to-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Latence DB</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-2xl font-bold',
              (dbHealth?.connectionLatencyMs || 0) < 500 ? 'text-green-600' : 'text-yellow-600'
            )}>
              {dbHealth?.connectionLatencyMs || 0}
            </span>
            <span className="text-sm text-muted-foreground">ms</span>
          </div>
        </div>
        
        <div className="rounded-xl border border-border p-4 bg-gradient-to-br from-background to-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Requêtes/h</span>
          </div>
          <span className="text-2xl font-bold">{efSummary.totalRequests}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edge-functions" className="gap-2">
            <Zap className="h-4 w-4" />
            Edge Functions
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-2">
            <Database className="h-4 w-4" />
            Base de données
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edge-functions" className="mt-4">
          <EdgeFunctionMonitor />
        </TabsContent>
        
        <TabsContent value="database" className="mt-4">
          <DatabaseHealthPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
