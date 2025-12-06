import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Activity, MessageSquare, CheckCircle2, AlertCircle, Clock, HelpCircle, BookPlus, FolderUp, FileText } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { safeQuery } from '@/lib/safeQuery';
import { errorToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';
import { getFaqStats, getImprovedQueriesCount, type FaqStats } from '@/lib/rag-improvement';
import { getIngestionStats, type IngestionStats } from '@/lib/rag-ingestion';

type QueryStatsRow = {
  status: string | null;
  chat_context: string | null;
  is_incomplete: boolean | null;
  created_at: string | null;
};

type DailyStats = {
  date: string;
  total: number;
  resolved: number;
  pending: number;
};

export function HelpiStatsTab() {
  const [totalQueries, setTotalQueries] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [incompleteCount, setIncompleteCount] = useState(0);
  const [improvedCount, setImprovedCount] = useState(0);
  const [contextBreakdown, setContextBreakdown] = useState<Record<string, number>>({});
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [faqStats, setFaqStats] = useState<FaqStats>({ total: 0, fromQueries: 0, byContext: {} });
  const [ingestionStats, setIngestionStats] = useState<IngestionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString();
      
      // Load queries stats
      const result = await safeQuery<QueryStatsRow[]>(
        supabase
          .from('chatbot_queries')
          .select('status, chat_context, is_incomplete, created_at')
          .gte('created_at', sevenDaysAgo),
        'RAG_STATS_LOAD'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load stats');
      }

      const queries = result.data || [];
      
      // Calculate totals
      setTotalQueries(queries.length);
      setResolvedCount(queries.filter(q => q.status === 'resolved').length);
      setPendingCount(queries.filter(q => q.status === 'pending').length);
      setIncompleteCount(queries.filter(q => q.is_incomplete).length);

      // Context breakdown
      const contextCounts: Record<string, number> = {};
      for (const q of queries) {
        const ctx = q.chat_context || 'autre';
        contextCounts[ctx] = (contextCounts[ctx] || 0) + 1;
      }
      setContextBreakdown(contextCounts);

      // Daily stats
      const dailyMap = new Map<string, { total: number; resolved: number; pending: number }>();
      for (const q of queries) {
        if (!q.created_at) continue;
        const day = format(new Date(q.created_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || { total: 0, resolved: 0, pending: 0 };
        existing.total++;
        if (q.status === 'resolved') existing.resolved++;
        if (q.status === 'pending') existing.pending++;
        dailyMap.set(day, existing);
      }
      
      const dailyArray: DailyStats[] = [];
      for (const [date, stats] of dailyMap) {
        dailyArray.push({ date, ...stats });
      }
      dailyArray.sort((a, b) => a.date.localeCompare(b.date));
      setDailyStats(dailyArray);

      // Load FAQ, improvement, and ingestion stats
      const [faqData, improvedData, ingestionData] = await Promise.all([
        getFaqStats(),
        getImprovedQueriesCount(),
        getIngestionStats(),
      ]);
      setFaqStats(faqData);
      setImprovedCount(improvedData);
      setIngestionStats(ingestionData);

    } catch (error) {
      logError('rag-stats', 'Error loading stats', error);
      errorToast('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const resolutionRate = totalQueries > 0 ? ((resolvedCount / totalQueries) * 100).toFixed(1) : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monitoring RAG (7 derniers jours)
        </CardTitle>
        <CardDescription>
          Statistiques d'utilisation et qualité des réponses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totalQueries}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Résolues</span>
                </div>
                <p className="text-2xl font-bold mt-1">{resolvedCount}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">En attente</span>
                </div>
                <p className="text-2xl font-bold mt-1">{pendingCount}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Incomplètes</span>
                </div>
                <p className="text-2xl font-bold mt-1">{incompleteCount}</p>
              </Card>
            </div>

            {/* Resolution Rate */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Taux de résolution</span>
                <span className={`text-lg font-bold ${Number(resolutionRate) >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {resolutionRate}%
                </span>
              </div>
            </Card>

            {/* Context Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-2">Répartition par contexte</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(contextBreakdown).map(([ctx, count]) => (
                  <Card key={ctx} className="px-3 py-2">
                    <span className="text-xs text-muted-foreground capitalize">{ctx}</span>
                    <p className="font-medium">{count}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* FAQ & Improvement Stats */}
            <div>
              <h4 className="text-sm font-medium mb-2">Améliorations & FAQ</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <BookPlus className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Questions améliorées</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{improvedCount}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">FAQ Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{faqStats.total}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">FAQ depuis queries</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{faqStats.fromQueries}</p>
                </Card>
              </div>
              
              {/* FAQ by context */}
              {Object.keys(faqStats.byContext).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">FAQ par contexte:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(faqStats.byContext).map(([ctx, count]) => (
                      <Card key={ctx} className="px-3 py-2">
                        <span className="text-xs text-muted-foreground capitalize">{ctx}</span>
                        <p className="font-medium">{count}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ingestion RAG Stats */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FolderUp className="w-4 h-4" />
                Ingestion RAG
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <FolderUp className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-muted-foreground">Jobs Total</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ingestionStats?.totalJobs ?? '—'}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Complétés</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ingestionStats?.completedJobs ?? '—'}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Échoués</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ingestionStats?.failedJobs ?? '—'}</p>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Documents</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ingestionStats?.totalDocuments ?? '—'}</p>
                </Card>
              </div>
              
              {ingestionStats && (
                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <span>Documents ce mois: <strong>{ingestionStats.documentsThisMonth}</strong></span>
                  {ingestionStats.avgProcessingTime > 0 && (
                    <span>Temps moyen: <strong>{ingestionStats.avgProcessingTime}s</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* Daily Activity */}
            {dailyStats.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Activité quotidienne</h4>
                <div className="flex gap-1 h-20">
                  {dailyStats.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col justify-end">
                      <div 
                        className="bg-primary/80 rounded-t"
                        style={{ height: `${Math.max(10, (day.total / Math.max(...dailyStats.map(d => d.total))) * 100)}%` }}
                        title={`${day.date}: ${day.total} questions`}
                      />
                      <span className="text-[10px] text-muted-foreground text-center mt-1">
                        {format(new Date(day.date), 'dd/MM', { locale: fr })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
