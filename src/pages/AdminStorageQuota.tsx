import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminStorageQuota() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['storage-quota-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_quota_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Actualiser toutes les 30 secondes
  });

  const formatBytes = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getSeverityColor = (percentage: number) => {
    if (percentage >= 95) return 'destructive';
    if (percentage >= 90) return 'default';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-app p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  const recentAlerts = alerts?.filter(a => 
    new Date(a.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ) || [];

  return (
    <div className="container mx-auto max-w-app p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Surveillance LocalStorage</h1>
          <p className="text-muted-foreground mt-2">
            Alertes de quota pour les utilisateurs
          </p>
        </div>
        <Badge variant={recentAlerts.length > 0 ? 'destructive' : 'secondary'} className="text-lg px-4 py-2">
          {recentAlerts.length} alertes (24h)
        </Badge>
      </div>

      {alerts && alerts.length > 0 ? (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-full ${
                    alert.percentage_used >= 95 
                      ? 'bg-destructive/10' 
                      : 'bg-orange-500/10'
                  }`}>
                    {alert.percentage_used >= 95 ? (
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    ) : (
                      <HardDrive className="h-6 w-6 text-orange-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{alert.user_email}</span>
                      {alert.user_agence && (
                        <Badge variant="outline">{alert.user_agence}</Badge>
                      )}
                      <Badge variant={getSeverityColor(alert.percentage_used)}>
                        {alert.percentage_used}% utilisé
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {formatBytes(alert.quota_used_bytes)} / {formatBytes(alert.quota_total_bytes)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(alert.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>

                    {alert.cache_keys && (
                      <details className="mt-3">
                        <summary className="text-sm cursor-pointer text-primary hover:underline">
                          Détails des caches ({Object.keys(alert.cache_keys).length} clés)
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {Object.entries(alert.cache_keys as Record<string, number>)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 10)
                            .map(([key, size]) => (
                              <div key={key} className="text-xs flex justify-between">
                                <span className="font-mono">{key}</span>
                                <span className="text-muted-foreground">
                                  {formatBytes(size as number)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune alerte de quota détectée</p>
        </Card>
      )}
    </div>
  );
}
