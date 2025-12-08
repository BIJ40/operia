import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DatabaseMetric {
  category: string;
  count: number;
  severity: 'info' | 'warning' | 'error';
  lastOccurrence: string | null;
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'error';
  connectionLatencyMs: number;
  recentErrors: DatabaseMetric[];
  recentWarnings: DatabaseMetric[];
  tableCount: number;
  activeConnections: number;
}

interface PostgresLogRow {
  error_severity: string;
  event_message: string;
  timestamp: number;
}

export function useDatabaseMetrics(refreshInterval: number = 30000) {
  return useQuery({
    queryKey: ["database-metrics"],
    queryFn: async (): Promise<DatabaseHealth> => {
      const startTime = Date.now();
      
      // Test database connectivity with a simple query
      const { error: connError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      
      const connectionLatencyMs = Date.now() - startTime;
      const tableCount = 104; // Known from schema

      // Determine status based on connectivity
      let status: DatabaseHealth['status'] = 'healthy';
      if (connError) status = 'error';
      else if (connectionLatencyMs > 2000) status = 'degraded';

      return {
        status,
        connectionLatencyMs,
        recentErrors: [],
        recentWarnings: [],
        tableCount,
        activeConnections: 0,
      };
    },
    refetchInterval: refreshInterval,
    staleTime: refreshInterval / 2,
  });
}

export function useDatabaseSummary() {
  const { data, isLoading, error, refetch } = useDatabaseMetrics();

  return {
    health: data,
    isLoading,
    error,
    refetch,
    statusColor: data?.status === 'healthy' 
      ? 'text-green-500' 
      : data?.status === 'degraded' 
        ? 'text-yellow-500' 
        : 'text-destructive',
    statusLabel: data?.status === 'healthy' 
      ? 'Opérationnel' 
      : data?.status === 'degraded' 
        ? 'Dégradé' 
        : 'Erreur',
  };
}
