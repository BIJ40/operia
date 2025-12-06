import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, HelpCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { safeQuery } from '@/lib/safeQuery';
import { errorToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

type GapAnalysis = {
  question: string;
  count: number;
  lastAsked: string;
  context: string | null;
  status: string;
};

type QueryRow = {
  question: string;
  created_at: string | null;
  chat_context: string | null;
  status: string | null;
  is_incomplete: boolean | null;
};

export function HelpiGapsTab() {
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const loadGaps = async () => {
    setLoading(true);
    try {
      // Get questions marked as incomplete or with no answer
      const result = await safeQuery<QueryRow[]>(
        supabase
          .from('chatbot_queries')
          .select('question, created_at, chat_context, status, is_incomplete')
          .or('is_incomplete.eq.true,status.eq.pending')
          .order('created_at', { ascending: false })
          .limit(200),
        'RAG_GAPS_LOAD'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load gaps');
      }

      const queries = result.data || [];
      setPendingCount(queries.filter(q => q.status === 'pending').length);

      // Group similar questions (simple keyword matching)
      const questionGroups = new Map<string, QueryRow[]>();
      
      for (const query of queries) {
        // Normalize question for grouping
        const normalized = query.question.toLowerCase().trim().substring(0, 100);
        const existing = questionGroups.get(normalized);
        if (existing) {
          existing.push(query);
        } else {
          questionGroups.set(normalized, [query]);
        }
      }

      // Convert to gap analysis
      const gapAnalysis: GapAnalysis[] = [];
      for (const [, group] of questionGroups) {
        const mostRecent = group[0];
        gapAnalysis.push({
          question: mostRecent.question,
          count: group.length,
          lastAsked: mostRecent.created_at || '',
          context: mostRecent.chat_context,
          status: mostRecent.status || 'pending',
        });
      }

      // Sort by count (most frequent gaps first)
      gapAnalysis.sort((a, b) => b.count - a.count);
      
      setGaps(gapAnalysis.slice(0, 50));
    } catch (error) {
      logError('rag-gaps', 'Error loading gaps', error);
      errorToast('Impossible de charger l\'analyse des lacunes');
      setGaps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGaps();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Analyse des Lacunes RAG
        </CardTitle>
        <CardDescription>
          Questions sans réponse satisfaisante - {pendingCount} en attente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={loadGaps} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : gaps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune lacune détectée</p>
            <p className="text-sm">Le RAG répond correctement aux questions</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {gaps.map((gap, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-2">{gap.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {gap.context && (
                        <Badge variant="outline" className="text-xs">
                          {gap.context}
                        </Badge>
                      )}
                      <span>
                        {gap.lastAsked && format(new Date(gap.lastAsked), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {gap.count > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {gap.count}x
                      </Badge>
                    )}
                    <Badge variant={gap.status === 'pending' ? 'destructive' : 'secondary'}>
                      {gap.status === 'pending' ? (
                        <><AlertTriangle className="w-3 h-3 mr-1" />Lacune</>
                      ) : (
                        gap.status
                      )}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {gaps.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">💡 Recommandation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les questions fréquentes sans réponse indiquent des lacunes dans la documentation. 
              Envisagez d'enrichir les guides correspondants.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
