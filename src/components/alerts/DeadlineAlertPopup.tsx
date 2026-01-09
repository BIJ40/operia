/**
 * Popup d'alerte rouge clignotante pour les échéances critiques
 * Affiché à la connexion pour les N2+
 * 
 * Logique d'acquittement : une fois que l'utilisateur clique "J'ai pris connaissance",
 * l'alerte ne réapparaîtra PAS tant que la liste d'alertes ne change pas (nouvelle alerte ajoutée).
 * L'acquittement est persisté côté serveur (table deadline_alert_acknowledgements) + localStorage fallback.
 */

import { useState, useEffect } from "react";
import { AlertTriangle, X, Calendar, Car, Shield, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCriticalDeadlineAlerts,
  formatDeadlineDate,
  formatDaysRemaining,
  DeadlineAlert,
} from "@/hooks/useDeadlineAlerts";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "deadline_alerts_dismissed";

function getAlertIcon(type: DeadlineAlert["type"]) {
  switch (type) {
    case "ct":
    case "revision":
    case "tires":
    case "leasing":
      return Car;
    case "insurance":
      return Shield;
    case "epi":
      return FileText;
    default:
      return AlertTriangle;
  }
}

function getTypeLabel(type: DeadlineAlert["type"]) {
  switch (type) {
    case "ct":
      return "CT";
    case "revision":
      return "Révision";
    case "insurance":
      return "Assurance";
    case "leasing":
      return "Leasing";
    case "tires":
      return "Pneus";
    case "epi":
      return "EPI";
    default:
      return type;
  }
}

export function DeadlineAlertPopup() {
  const { user, agencyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: alerts = [], isLoading, hasCriticalAlerts } = useCriticalDeadlineAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const currentAlertIds = alerts.map((a) => a.id);
  const currentIdsKey = [...currentAlertIds].sort().join(",");
  const storageKey = user?.id && agencyId ? `${STORAGE_KEY}:${user.id}:${agencyId}` : STORAGE_KEY;

  // Table deadline_alert_acknowledgements (typée côté backend)
  const supabaseAny = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  // Récupérer l'acquittement serveur pour user+agency
  // Un seul enregistrement par combo user_id+agency_id grâce à la contrainte unique
  const { data: ackRow, isLoading: ackLoading } = useQuery({
    queryKey: ["deadline-alert-ack", user?.id, agencyId],
    queryFn: async () => {
      if (!user?.id || !agencyId) return null;
      const { data, error } = await supabaseAny
        .from("deadline_alert_acknowledgements")
        .select("alert_ids, acknowledged_on, updated_at")
        .eq("user_id", user.id)
        .eq("agency_id", agencyId)
        .maybeSingle();

      if (error) throw error;
      return data as { alert_ids: string[]; acknowledged_on: string; updated_at: string } | null;
    },
    enabled: !!user?.id && !!agencyId && alerts.length > 0,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Vérifie si toutes les alertes actuelles sont couvertes par l'acquittement
  const isCoveredByAck = (ackedIds: string[] | null | undefined) => {
    if (!ackedIds || ackedIds.length === 0) return false;
    if (currentAlertIds.length === 0) return true;
    const ackSet = new Set(ackedIds);
    // Toutes les alertes actuelles doivent être dans les alertes acquittées
    return currentAlertIds.every((id) => ackSet.has(id));
  };

  // Logique de dismissed basée sur serveur puis localStorage fallback
  useEffect(() => {
    // 1) Si un ack serveur existe et couvre toutes les alertes actuelles, on ne montre pas
    if (!ackLoading && ackRow && isCoveredByAck(ackRow.alert_ids)) {
      setDismissed(true);
      return;
    }

    // 2) Sinon fallback localStorage (par user+agency)
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      setDismissed(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { alertIds?: string[] | string };
      const storedIds = Array.isArray(parsed.alertIds)
        ? parsed.alertIds
        : typeof parsed.alertIds === "string"
          ? parsed.alertIds.split(",").filter(Boolean)
          : [];

      const storeSet = new Set(storedIds);
      const covered = currentAlertIds.every((id) => storeSet.has(id));
      setDismissed(covered);
    } catch {
      localStorage.removeItem(storageKey);
      setDismissed(false);
    }
  }, [ackLoading, ackRow, currentIdsKey, storageKey]);

  // Afficher le popup quand il y a des alertes non validées
  useEffect(() => {
    if (!isLoading && !ackLoading && alerts.length > 0 && !dismissed) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [alerts.length, isLoading, ackLoading, dismissed]);

  const handleDismiss = async () => {
    const sortedAlertIds = [...currentAlertIds].sort();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1) Toujours écrire localStorage (fallback robuste)
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          alertIds: sortedAlertIds,
        })
      );
    } catch {
      // ignore localStorage errors
    }

    // 2) Persistance serveur avec UPSERT sur contrainte unique (user_id, agency_id)
    // Cela met à jour l'enregistrement existant au lieu d'en créer un nouveau chaque jour
    try {
      if (user?.id && agencyId) {
        await supabaseAny
          .from("deadline_alert_acknowledgements")
          .upsert(
            {
              user_id: user.id,
              agency_id: agencyId,
              acknowledged_on: today,
              alert_ids: sortedAlertIds,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,agency_id" }
          );
        
        // Invalider le cache pour que la prochaine requête récupère les données à jour
        queryClient.invalidateQueries({ queryKey: ["deadline-alert-ack", user.id, agencyId] });
      }
    } catch {
      // fallback localStorage suffit, on ne bloque pas l'UX
    }

    setDismissed(true);
    setIsOpen(false);
  };

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent 
        className={cn(
          "max-w-lg border-2",
          hasCriticalAlerts 
            ? "border-destructive bg-destructive/5 animate-pulse-slow" 
            : "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
        )}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "p-2 rounded-full",
                hasCriticalAlerts 
                  ? "bg-destructive text-destructive-foreground animate-bounce-slow" 
                  : "bg-orange-500 text-white"
              )}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <AlertDialogTitle className={cn(
                "text-xl font-bold",
                hasCriticalAlerts ? "text-destructive" : "text-orange-600 dark:text-orange-400"
              )}>
                ⚠️ Alertes Échéances
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="mr-2 animate-pulse">
                    {criticalCount} critique{criticalCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="border-orange-500 text-orange-600">
                    {warningCount} à surveiller
                  </Badge>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const isCritical = alert.severity === "critical";
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    isCritical 
                      ? "bg-destructive/10 border-destructive/30" 
                      : "bg-orange-100/50 dark:bg-orange-900/20 border-orange-300/50"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    isCritical ? "text-destructive" : "text-orange-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant={isCritical ? "destructive" : "outline"}
                        className={cn(
                          "text-xs",
                          !isCritical && "border-orange-400 text-orange-600"
                        )}
                      >
                        {getTypeLabel(alert.type)}
                      </Badge>
                      <span className="font-medium text-sm truncate">
                        {alert.entityName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDeadlineDate(alert.dueDate)}</span>
                      <span className={cn(
                        "font-medium",
                        isCritical ? "text-destructive" : "text-orange-600"
                      )}>
                        ({formatDaysRemaining(alert.daysRemaining)})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <AlertDialogFooter className="mt-4">
          <Button
            onClick={handleDismiss}
            className={cn(
              "w-full",
              hasCriticalAlerts 
                ? "bg-destructive hover:bg-destructive/90" 
                : "bg-orange-500 hover:bg-orange-600"
            )}
          >
            <X className="h-4 w-4 mr-2" />
            J'ai pris connaissance de ces alertes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
