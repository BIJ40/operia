import { useState } from 'react';
import { useEdgeFunctionSummary, EdgeFunctionMetric } from '@/hooks/useEdgeFunctionMetrics';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Search,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Opérationnel' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Dégradé' },
  error: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Erreur' },
  inactive: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'Inactif' },
};

const CATEGORIES = ['Tous', 'Proxy', 'IA', 'Notifications', 'KPIs', 'RAG', 'Cron', 'GDPR'];

export function EdgeFunctionMonitor() {
  const { summary, metrics, isLoading } = useEdgeFunctionSummary();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tous');

  const filteredMetrics = metrics?.filter((m) => {
    const matchesSearch = m.functionName.toLowerCase().includes(search.toLowerCase()) ||
                         m.functionId.toLowerCase().includes(search.toLowerCase());
    
    if (categoryFilter === 'Tous') return matchesSearch;
    
    // Simple category matching based on function name patterns
    const categoryMap: Record<string, string[]> = {
      'Proxy': ['proxy'],
      'IA': ['chat', 'search', 'classify', 'analyze', 'generate', 'unified', 'helpi', 'faq'],
      'Notifications': ['notify', 'send', 'sms', 'email'],
      'KPIs': ['kpi'],
      'RAG': ['regenerate', 'index'],
      'Cron': ['maintenance', 'scan'],
      'GDPR': ['export'],
    };
    
    const patterns = categoryMap[categoryFilter] || [];
    const matchesCategory = patterns.some(p => m.functionId.toLowerCase().includes(p));
    
    return matchesSearch && matchesCategory;
  }) || [];

  const renderStatusBadge = (status: EdgeFunctionMetric['status']) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn('gap-1', config.bg)}>
        <Icon className={cn('h-3 w-3', config.color)} />
        <span className={config.color}>{config.label}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Activity className="h-6 w-6 animate-pulse text-helpconfort-blue" />
        <span className="ml-2 text-muted-foreground">Chargement des métriques...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-helpconfort-blue/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-helpconfort-blue" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalFunctions}</p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Sains</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.healthyCount}</p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Dégradés</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{summary.degradedCount}</p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Erreurs</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{summary.errorCount}</p>
        </div>
        
        <div className="rounded-lg border border-border p-4 bg-gradient-to-br from-background to-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Requêtes/h</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalRequests}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une fonction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Functions Table */}
      <ScrollArea className="h-[400px] rounded-lg border">
        <div className="divide-y divide-border">
          {filteredMetrics.map((metric) => (
            <div 
              key={metric.functionId}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  metric.status === 'healthy' && 'bg-green-500',
                  metric.status === 'degraded' && 'bg-yellow-500',
                  metric.status === 'error' && 'bg-destructive',
                  metric.status === 'inactive' && 'bg-muted-foreground',
                )} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{metric.functionName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{metric.functionId}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right hidden sm:block">
                  <p className="font-medium">{metric.totalRequests}</p>
                  <p className="text-xs text-muted-foreground">requêtes</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="font-medium">{metric.avgLatencyMs}ms</p>
                  <p className="text-xs text-muted-foreground">latence moy.</p>
                </div>
                <div className="text-right hidden lg:block">
                  <p className={cn(
                    'font-medium',
                    metric.successRate >= 95 ? 'text-green-600' : 
                    metric.successRate >= 80 ? 'text-yellow-600' : 'text-destructive'
                  )}>
                    {metric.successRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">succès</p>
                </div>
                {renderStatusBadge(metric.status)}
              </div>
            </div>
          ))}
          
          {filteredMetrics.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Aucune fonction trouvée
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
