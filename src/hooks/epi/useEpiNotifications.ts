import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EpiNotificationType = 
  | "ack_signed"
  | "ack_with_issues"
  | "request_created"
  | "request_seen"
  | "request_approved"
  | "request_rejected"
  | "epi_assigned"
  | "renewal_reminder"
  | "ack_reminder";

export interface EpiNotification {
  id: string;
  agency_id: string;
  sender_id: string;
  recipient_id: string;
  notification_type: EpiNotificationType;
  related_request_id: string | null;
  related_ack_id: string | null;
  related_assignment_id: string | null;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  seen_by_recipient: boolean;
  seen_at: string | null;
  created_at: string;
  // Joined
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function useMyEpiNotifications(collaboratorId?: string) {
  return useQuery({
    queryKey: ["epi-notifications", "my", collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      
      const { data, error } = await supabase
        .from("epi_notifications")
        .select(`
          *,
          sender:collaborators!sender_id(id, first_name, last_name)
        `)
        .eq("recipient_id", collaboratorId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as EpiNotification[];
    },
    enabled: !!collaboratorId,
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useUnreadEpiNotificationsCount(collaboratorId?: string) {
  return useQuery({
    queryKey: ["epi-notifications", "unread-count", collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return 0;
      
      const { count, error } = await supabase
        .from("epi_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", collaboratorId)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!collaboratorId,
    refetchInterval: 30000,
  });
}

export function useMarkEpiNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("epi_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-notifications"] });
    },
  });
}

export function useMarkEpiNotificationSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("epi_notifications")
        .update({ seen_by_recipient: true, seen_at: new Date().toISOString() })
        .eq("id", notificationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-notifications"] });
    },
  });
}

interface CreateNotificationParams {
  agency_id: string;
  sender_id: string;
  recipient_id: string;
  notification_type: EpiNotificationType;
  title: string;
  message?: string | null;
  related_request_id?: string | null;
  related_ack_id?: string | null;
  related_assignment_id?: string | null;
}

export function useCreateEpiNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      const { data, error } = await supabase
        .from("epi_notifications")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-notifications"] });
    },
  });
}

// Mark request as seen by manager
export function useMarkRequestSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, managerId }: { requestId: string; managerId: string }) => {
      const { data, error } = await supabase
        .from("epi_requests")
        .update({ 
          seen_by_manager_at: new Date().toISOString(),
          seen_by_manager_id: managerId
        })
        .eq("id", requestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-requests"] });
      toast.success("Demande marquée comme vue");
    },
  });
}
