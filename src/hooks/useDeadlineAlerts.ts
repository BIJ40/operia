/**
 * Hook pour détecter les échéances critiques (CT, révision, assurance, etc.)
 * Utilisé pour afficher les alertes popup aux N2 à la connexion
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";

export interface DeadlineAlert {
  id: string;
  type: "ct" | "revision" | "insurance" | "leasing" | "tires" | "epi";
  label: string;
  entityName: string;
  entityId: string;
  dueDate: string;
  daysRemaining: number;
  severity: "critical" | "warning" | "info";
}

const DEFAULT_ALERT_DAYS = 30; // Alerte par défaut 30 jours avant

function getSeverity(daysRemaining: number): "critical" | "warning" | "info" {
  if (daysRemaining <= 0) return "critical";
  if (daysRemaining <= 7) return "critical";
  if (daysRemaining <= 14) return "warning";
  return "info";
}

export function useDeadlineAlerts() {
  const { user, agencyId, globalRole } = useAuth();
  
  // Seulement pour N2+ (franchisee_admin et plus)
  const isN2Plus = globalRole && ["franchisee_admin", "franchisor_user", "franchisor_admin", "platform_admin", "superadmin"].includes(globalRole);

  return useQuery({
    queryKey: ["deadline-alerts", agencyId],
    queryFn: async (): Promise<DeadlineAlert[]> => {
      if (!agencyId) return [];

      const alerts: DeadlineAlert[] = [];
      const today = new Date();

      // 1. Véhicules - CT, Révision, Assurance, Leasing, Pneus
      const { data: vehicles, error: vehiclesError } = await supabase
        .from("fleet_vehicles")
        .select("id, name, registration, ct_due_at, ct_alert_days, next_revision_at, revision_alert_days, insurance_expiry_at, insurance_alert_days, leasing_end_at, leasing_alert_days, next_tires_change_at")
        .eq("agency_id", agencyId)
        .neq("status", "retired");

      if (!vehiclesError && vehicles) {
        for (const v of vehicles) {
          const vehicleName = `${v.name}${v.registration ? ` (${v.registration})` : ""}`;

          // CT
          if (v.ct_due_at) {
            const dueDate = parseISO(v.ct_due_at);
            const daysRemaining = differenceInDays(dueDate, today);
            const alertThreshold = v.ct_alert_days ?? DEFAULT_ALERT_DAYS;
            
            if (daysRemaining <= alertThreshold) {
              alerts.push({
                id: `ct-${v.id}`,
                type: "ct",
                label: "Contrôle Technique",
                entityName: vehicleName,
                entityId: v.id,
                dueDate: v.ct_due_at,
                daysRemaining,
                severity: getSeverity(daysRemaining),
              });
            }
          }

          // Révision
          if (v.next_revision_at) {
            const dueDate = parseISO(v.next_revision_at);
            const daysRemaining = differenceInDays(dueDate, today);
            const alertThreshold = v.revision_alert_days ?? DEFAULT_ALERT_DAYS;
            
            if (daysRemaining <= alertThreshold) {
              alerts.push({
                id: `revision-${v.id}`,
                type: "revision",
                label: "Révision",
                entityName: vehicleName,
                entityId: v.id,
                dueDate: v.next_revision_at,
                daysRemaining,
                severity: getSeverity(daysRemaining),
              });
            }
          }

          // Assurance
          if (v.insurance_expiry_at) {
            const dueDate = parseISO(v.insurance_expiry_at);
            const daysRemaining = differenceInDays(dueDate, today);
            const alertThreshold = v.insurance_alert_days ?? DEFAULT_ALERT_DAYS;
            
            if (daysRemaining <= alertThreshold) {
              alerts.push({
                id: `insurance-${v.id}`,
                type: "insurance",
                label: "Assurance",
                entityName: vehicleName,
                entityId: v.id,
                dueDate: v.insurance_expiry_at,
                daysRemaining,
                severity: getSeverity(daysRemaining),
              });
            }
          }

          // Leasing
          if (v.leasing_end_at) {
            const dueDate = parseISO(v.leasing_end_at);
            const daysRemaining = differenceInDays(dueDate, today);
            const alertThreshold = v.leasing_alert_days ?? 60; // 60 jours pour leasing
            
            if (daysRemaining <= alertThreshold) {
              alerts.push({
                id: `leasing-${v.id}`,
                type: "leasing",
                label: "Fin de Leasing",
                entityName: vehicleName,
                entityId: v.id,
                dueDate: v.leasing_end_at,
                daysRemaining,
                severity: getSeverity(daysRemaining),
              });
            }
          }

          // Pneus
          if (v.next_tires_change_at) {
            const dueDate = parseISO(v.next_tires_change_at);
            const daysRemaining = differenceInDays(dueDate, today);
            
            if (daysRemaining <= DEFAULT_ALERT_DAYS) {
              alerts.push({
                id: `tires-${v.id}`,
                type: "tires",
                label: "Changement Pneus",
                entityName: vehicleName,
                entityId: v.id,
                dueDate: v.next_tires_change_at,
                daysRemaining,
                severity: getSeverity(daysRemaining),
              });
            }
          }
        }
      }

      // Trier par gravité puis par jours restants
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.daysRemaining - b.daysRemaining;
      });

      return alerts;
    },
    enabled: !!agencyId && !!user && isN2Plus,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook pour les alertes critiques seulement (pour le popup)
export function useCriticalDeadlineAlerts() {
  const { data: alerts = [], ...rest } = useDeadlineAlerts();
  
  const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "warning");
  
  return {
    ...rest,
    data: criticalAlerts,
    hasCriticalAlerts: criticalAlerts.some(a => a.severity === "critical"),
    hasWarningAlerts: criticalAlerts.some(a => a.severity === "warning"),
  };
}

export function formatDeadlineDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Dépassé de ${Math.abs(days)} jour${Math.abs(days) > 1 ? "s" : ""}`;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  return `Dans ${days} jours`;
}
