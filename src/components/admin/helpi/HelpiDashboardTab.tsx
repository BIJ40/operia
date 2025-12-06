/**
 * Helpi Dashboard Tab - Statistiques globales de l'index
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Database, FileText, HelpCircle, BookOpen, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface HelpiStats {
  total_chunks: number;
  chunks_with_embedding: number;
  by_block_type: Array<{ block_type: string; count: number }>;
  last_indexed_at: string | null;
}

const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  apogee: <BookOpen className="h-4 w-4" />,
  helpconfort: <FileText className="h-4 w-4" />,
  document: <Database className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  apogee: "Guides Apogée",
  helpconfort: "Guides HelpConfort",
  document: "Documents",
  faq: "FAQ",
};

export function HelpiDashboardTab() {
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["helpi-stats"],
    queryFn: async (): Promise<HelpiStats> => {
      const { data, error } = await supabase.rpc("get_helpi_stats");
      
      if (error) {
        console.error("[HELPI] Stats error:", error);
        throw error;
      }

      // Handle array result from RPC
      const result = Array.isArray(data) ? data[0] : data;
      
      const byBlockType = Array.isArray(result?.by_block_type) 
        ? result.by_block_type as Array<{ block_type: string; count: number }>
        : [];
      
      return {
        total_chunks: result?.total_chunks || 0,
        chunks_with_embedding: result?.chunks_with_embedding || 0,
        by_block_type: byBlockType,
        last_indexed_at: result?.last_indexed_at || null,
      };
    },
    staleTime: 30000,
  });

  const embeddingCoverage = stats?.total_chunks 
    ? Math.round((stats.chunks_with_embedding / stats.total_chunks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chunks totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total_chunks || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avec embedding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div>
                <div className="text-2xl font-bold">{stats?.chunks_with_embedding || 0}</div>
                <p className="text-xs text-muted-foreground">{embeddingCoverage}% de couverture</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sources indexées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.by_block_type?.length || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dernière indexation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : stats?.last_indexed_at ? (
              <div className="text-sm font-medium">
                {formatDistanceToNow(new Date(stats.last_indexed_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aucune donnée</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Répartition par source</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats?.by_block_type?.length ? (
            <div className="space-y-4">
              {stats.by_block_type.map((item) => {
                const percentage = stats.total_chunks 
                  ? Math.round((item.count / stats.total_chunks) * 100) 
                  : 0;

                return (
                  <div key={item.block_type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {BLOCK_TYPE_ICONS[item.block_type] || <Database className="h-4 w-4" />}
                        <span className="font-medium">
                          {BLOCK_TYPE_LABELS[item.block_type] || item.block_type}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {item.count} chunks ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun contenu indexé</p>
              <p className="text-sm">Utilisez l'onglet "Indexer" pour démarrer</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
