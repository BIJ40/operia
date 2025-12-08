import { useDatabaseSummary } from '@/hooks/useDatabaseMetrics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Clock,
  Table,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TABLE_CATEGORIES, SYSTEM_STATS } from '@/config/docsData';

export function DatabaseHealthPanel() {
  const { health, isLoading, refetch, statusColor, statusLabel } = useDatabaseSummary();

  const getStatusIcon = () => {
    if (!health) return <Activity className="h-5 w-5 animate-pulse" />;
    switch (health.status) {
      case 'healthy': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center bg-background">
            <Database className="w-6 h-6 text-helpconfort-blue" />
          </div>
          <div>
            <h3 className="font-semibold">Base de Données</h3>
            <p className="text-sm text-muted-foreground">Lovable Cloud (Supabase)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn('gap-1', health?.status === 'healthy' && 'bg-green-500/10')}>
            {getStatusIcon()}
            <span className={statusColor}>{statusLabel}</span>
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-helpconfort-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium">Latence</span>
          </div>
          <p className={cn(
            'text-2xl font-bold',
            (health?.connectionLatencyMs || 0) < 500 ? 'text-green-600' :
            (health?.connectionLatencyMs || 0) < 2000 ? 'text-yellow-600' : 'text-destructive'
          )}>
            {health?.connectionLatencyMs || 0}ms
          </p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-helpconfort-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <Table className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium">Tables</span>
          </div>
          <p className="text-2xl font-bold">{SYSTEM_STATS.totalTables}</p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Erreurs (1h)</span>
          </div>
          <p className="text-2xl font-bold text-destructive">
            {health?.recentErrors.reduce((sum, e) => sum + e.count, 0) || 0}
          </p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Warnings (1h)</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {health?.recentWarnings.reduce((sum, w) => sum + w.count, 0) || 0}
          </p>
        </div>
      </div>

      {/* Table Categories */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <h4 className="font-medium">Catégories de tables</h4>
        </div>
        <ScrollArea className="h-[250px]">
          <div className="divide-y divide-border">
            {TABLE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.tables.slice(0, 3).join(', ')}
                    {cat.tables.length > 3 && ` +${cat.tables.length - 3} autres`}
                  </p>
                </div>
                <Badge variant="secondary">{cat.tables.length} tables</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Recent Errors */}
      {health?.recentErrors && health.recentErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 overflow-hidden">
          <div className="bg-destructive/10 px-4 py-3 border-b border-destructive/30">
            <h4 className="font-medium text-destructive">Erreurs récentes</h4>
          </div>
          <ScrollArea className="h-[150px]">
            <div className="divide-y divide-border">
              {health.recentErrors.map((error, index) => (
                <div key={index} className="p-3">
                  <p className="text-sm font-mono truncate">{error.category}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {error.count} occurrence(s)
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
