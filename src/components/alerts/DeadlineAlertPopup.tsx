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
const DISMISS_FOREVER_TOKEN = "__DISMISS_FOREVER__";

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

  // IMPORTANT: la clé peut évoluer quand agencyId arrive après le 1er rendu.
  // On garde une clé "user" stable (évite les ré-affichages), et une clé "user+agency" quand dispo.
  const userStorageKey = user?.id ? `${STORAGE_KEY}:${user.id}` : STORAGE_KEY;
  const agencyStorageKey = user?.id && agencyId ? `${STORAGE_KEY}:${user.id}:${agencyId}` : userStorageKey;
  const storageKeys = Array.from(new Set([STORAGE_KEY, userStorageKey, agencyStorageKey]));

  // Vérification IMMEDIATE du localStorage pour éviter tout flash
  const checkLocalStorageForeverDismiss = (keys: string[]): boolean => {
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        // Support anciens formats: JSON objet / JSON array / string brute
        let storedIds: string[] = [];
        try {
          const parsed = JSON.parse(stored) as unknown;
          if (Array.isArray(parsed)) {
            storedIds = parsed.filter((x): x is string => typeof x === "string");
          } else if (parsed && typeof parsed === "object" && "alertIds" in (parsed as any)) {
            const alertIds = (parsed as any).alertIds as string[] | string | undefined;
            storedIds = Array.isArray(alertIds)
              ? alertIds
              : typeof alertIds === "string"
                ? alertIds.split(",").filter(Boolean)
                : [];
          }
        } catch {
          storedIds = stored.split(",").filter(Boolean);
        }

        if (storedIds.includes(DISMISS_FOREVER_TOKEN)) return true;
      } catch {
        // ignore
      }
    }

    return false;
  };

  // État dismissed initialisé avec vérification localStorage immédiate
  const [dismissed, setDismissed] = useState(() => checkLocalStorageForeverDismiss(storageKeys));

  // IMPORTANT: si agencyId arrive après le premier rendu, on ne doit PAS ré-afficher
  useEffect(() => {
    setDismissed(checkLocalStorageForeverDismiss(storageKeys));
  }, [userStorageKey, agencyStorageKey]);

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
    enabled: !!user?.id && !!agencyId && !dismissed, // Ne pas fetch si déjà dismissed
    staleTime: 1000 * 60 * 60, // 1h - plus long car dismiss est permanent
    refetchOnWindowFocus: false,
  });

  // Vérifie si le token DISMISS_FOREVER est présent dans les alert_ids
  const hasForeverDismissToken = (ackedIds: string[] | null | undefined): boolean => {
    if (!ackedIds || ackedIds.length === 0) return false;
    return ackedIds.includes(DISMISS_FOREVER_TOKEN);
  };

  // Logique de dismissed basée sur serveur (vérification unique au chargement)
  useEffect(() => {
    // Si déjà dismissed via localStorage, ne rien faire
    if (dismissed) return;

    // Attendre que le serveur réponde
    if (ackLoading) return;

    // Vérifier le serveur pour le token DISMISS_FOREVER
    if (ackRow && hasForeverDismissToken(ackRow.alert_ids)) {
      setDismissed(true);
      // Synchroniser localStorage si pas encore fait (sur toutes les variantes de clés)
      for (const key of storageKeys) {
        try {
          localStorage.setItem(key, JSON.stringify({ alertIds: [DISMISS_FOREVER_TOKEN] }));
        } catch {
          // ignore
        }
      }
      return;
    }
  }, [ackLoading, ackRow, dismissed, userStorageKey, agencyStorageKey]);

  // Afficher le popup quand il y a des alertes non validées
  useEffect(() => {
    // Ne jamais ouvrir si dismissed
    if (dismissed) {
      setIsOpen(false);
      return;
    }

    if (!isLoading && !ackLoading && alerts.length > 0) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [alerts.length, isLoading, ackLoading, dismissed]);

  const handleDismiss = async () => {
    // Fermer immédiatement (évite tout ré-affichage pendant la persistance)
    setDismissed(true);
    setIsOpen(false);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // IMPORTANT : demande utilisateur => désactiver DEFINITIVEMENT cette popup après clic
    const persistedAlertIds = [DISMISS_FOREVER_TOKEN];

    // 1) Toujours écrire localStorage (fallback robuste) sur toutes les variantes de clés
    for (const key of storageKeys) {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            alertIds: persistedAlertIds,
          })
        );
      } catch {
        // ignore localStorage errors
      }
    }

    // 2) Persistance serveur avec UPSERT sur contrainte unique (user_id, agency_id)
    try {
      if (user?.id && agencyId) {
        await supabaseAny
          .from("deadline_alert_acknowledgements")
          .upsert(
            {
              user_id: user.id,
              agency_id: agencyId,
              acknowledged_on: today,
              alert_ids: persistedAlertIds,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,agency_id" }
          );

        queryClient.invalidateQueries({ queryKey: ["deadline-alert-ack", user.id, agencyId] });
      }
    } catch {
      // fallback localStorage suffit, on ne bloque pas l'UX
    }
  };

  if (alerts.length === 0 || dismissed) return null;

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent 
        className={cn(
          "max-w-lg border-2",
          hasCriticalAlerts 
            ? "border-destructive bg-destructive/5" 
            : "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
        )}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "p-2 rounded-full",
                hasCriticalAlerts 
                  ? "bg-destructive text-destructive-foreground" 
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
                  <Badge variant="destructive" className="mr-2">
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
