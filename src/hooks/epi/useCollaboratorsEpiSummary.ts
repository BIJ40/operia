/**
 * Hook pour récupérer les statistiques EPI par collaborateur pour /rh/suivi
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollaboratorEpiSummary {
  collaborator_id: string;
  epi_count: number;
  pending_requests: number;
  open_incidents: number;
  ack_status: "pending" | "signed_by_n1" | "signed_by_n2" | "overdue" | null;
  renewal_due_count: number;
  epi_ok: boolean;
}

export function useCollaboratorsEpiSummary(agencyId?: string) {
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  return useQuery({
    queryKey: ["collaborators-epi-summary", agencyId, currentMonth],
    queryFn: async () => {
      if (!agencyId) return [];

      // Get all collaborators for the agency
      const { data: collaborators, error: collabError } = await supabase
        .from("collaborators")
        .select("id")
        .eq("agency_id", agencyId)
        .is("leaving_date", null);

      if (collabError) throw collabError;
      if (!collaborators || collaborators.length === 0) return [];

      const collabIds = collaborators.map((c) => c.id);

      // Fetch all EPI data in parallel
      const [assignmentsRes, requestsRes, incidentsRes, acksRes] = await Promise.all([
        supabase
          .from("epi_assignments")
          .select("id, user_id, expected_renewal_at, status")
          .eq("agency_id", agencyId)
          .eq("status", "active"),
        supabase
          .from("epi_requests")
          .select("id, requester_user_id, status")
          .eq("agency_id", agencyId)
          .eq("status", "pending"),
        supabase
          .from("epi_incidents")
          .select("id, reporter_user_id, status")
          .eq("agency_id", agencyId)
          .eq("status", "open"),
        supabase
          .from("epi_monthly_acknowledgements")
          .select("id, user_id, status")
          .eq("agency_id", agencyId)
          .eq("month", currentMonth),
      ]);

      const assignments = assignmentsRes.data || [];
      const requests = requestsRes.data || [];
      const incidents = incidentsRes.data || [];
      const acks = acksRes.data || [];

      const thirtyDaysFromNow = Date.now() + 30 * 24 * 60 * 60 * 1000;

      // Build summary for each collaborator
      const summaries: CollaboratorEpiSummary[] = collabIds.map((collabId) => {
        const collabAssignments = assignments.filter((a) => a.user_id === collabId);
        const collabRequests = requests.filter((r) => r.requester_user_id === collabId);
        const collabIncidents = incidents.filter((i) => i.reporter_user_id === collabId);
        const collabAck = acks.find((a) => a.user_id === collabId);

        const renewalDue = collabAssignments.filter(
          (a) => a.expected_renewal_at && new Date(a.expected_renewal_at).getTime() < thirtyDaysFromNow
        );

        const epiOk =
          collabAssignments.length > 0 &&
          collabRequests.length === 0 &&
          collabIncidents.length === 0 &&
          renewalDue.length === 0 &&
          (collabAck?.status === "signed_by_n1" || collabAck?.status === "signed_by_n2");

        return {
          collaborator_id: collabId,
          epi_count: collabAssignments.length,
          pending_requests: collabRequests.length,
          open_incidents: collabIncidents.length,
          ack_status: (collabAck?.status as any) || null,
          renewal_due_count: renewalDue.length,
          epi_ok: epiOk,
        };
      });

      return summaries;
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}
