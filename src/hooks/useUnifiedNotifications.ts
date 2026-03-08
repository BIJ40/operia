import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthCore } from "@/contexts/AuthCoreContext";
import { useEffect } from "react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface UnifiedNotification {
  id: string;
  user_id: string;
  agency_id: string | null;
  category: string;
  notification_type: string;
  title: string;
  message: string | null;
  icon: string | null;
  action_url: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  is_pushed: boolean;
  pushed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

export function useUnifiedNotifications(limit = 50) {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unified-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("unified_notifications")
        .select("*")
        .eq("user_id", user.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UnifiedNotification[];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "unified_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<UnifiedNotification>) => {
          queryClient.setQueryData<UnifiedNotification[]>(
            ["unified-notifications", user.id],
            (old) => {
              if (!old) return [payload.new as UnifiedNotification];
              return [payload.new as UnifiedNotification, ...old];
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "unified_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<UnifiedNotification>) => {
          queryClient.setQueryData<UnifiedNotification[]>(
            ["unified-notifications", user.id],
            (old) => {
              if (!old) return [];
              return old.map((n) =>
                n.id === (payload.new as UnifiedNotification).id 
                  ? payload.new as UnifiedNotification 
                  : n
              );
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

export function useUnreadNotificationsCount() {
  const { user } = useAuthCore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unified-notifications-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count, error } = await supabase
        .from("unified_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Poll every 30s as backup
  });

  // Realtime subscription for count updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-count-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unified_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["unified-notifications-count", user.id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { data, error } = await supabase.rpc("mark_notifications_read", {
        p_notification_ids: notificationIds,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["unified-notifications", user?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["unified-notifications-count", user?.id] 
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("unified_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["unified-notifications", user?.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["unified-notifications-count", user?.id] 
      });
    },
  });
}
