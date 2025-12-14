/**
 * Popup de notification RH affichée au login
 * Affiche les demandes récemment traitées (approuvées/rejetées) depuis la dernière connexion
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/config/routes';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PendingNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  related_request_id: string | null;
  created_at: string;
}

export function RHLoginNotificationPopup() {
  const { user, isAuthenticated, globalRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notification, setNotification] = useState<PendingNotification | null>(null);

  const isRH =
    globalRole &&
    ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);

  // Check for unread request notifications on login
  const { data: unreadNotifications } = useQuery({
    queryKey: ['rh-login-notifications', user?.id, isRH ? 'RH' : 'EMP'],
    queryFn: async () => {
      if (!user?.id) return [];

      const baseQuery = supabase
        .from('rh_notifications')
        .select('id, notification_type, title, message, related_request_id, created_at')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data, error } = isRH
        ? await baseQuery.in('notification_type', ['REQUEST_CREATED'])
        : await baseQuery.in('notification_type', ['REQUEST_COMPLETED', 'REQUEST_REJECTED']);

      if (error) throw error;
      return (data || []) as PendingNotification[];
    },
    enabled: !!user?.id && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Realtime: afficher immédiatement les nouvelles notifications pertinentes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('rh-login-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rh_notifications',
        },
        (payload) => {
          const newNotif = payload.new as PendingNotification & { recipient_id?: string };

          if (!newNotif || newNotif.recipient_id !== user.id) return;

          const isForRH = isRH && newNotif.notification_type === 'REQUEST_CREATED';
          const isForEmployee =
            !isRH &&
            (newNotif.notification_type === 'REQUEST_COMPLETED' || newNotif.notification_type === 'REQUEST_REJECTED');

          if (isForRH || isForEmployee) {
            // Invalider la query et afficher immédiatement la popup
            queryClient.invalidateQueries({ queryKey: ['rh-login-notifications'] });
            setNotification({
              id: newNotif.id,
              notification_type: newNotif.notification_type,
              title: newNotif.title,
              message: newNotif.message,
              related_request_id: newNotif.related_request_id ?? null,
              created_at: newNotif.created_at,
            });
            setOpen(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isRH, queryClient]);

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('rh_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['rh-login-notifications'] });
    },
  });

  // Show popup when unread notification found (au login / refresh)
  useEffect(() => {
    if (unreadNotifications && unreadNotifications.length > 0) {
      setNotification(unreadNotifications[0]);
      setOpen(true);
    }
  }, [unreadNotifications]);

  const handleView = async () => {
    if (notification) {
      await markAsRead.mutateAsync(notification.id);
    }
    setOpen(false);
    if (isRH || notification?.notification_type === 'REQUEST_CREATED') {
      navigate(ROUTES.rh.demandes);
    } else {
      navigate(ROUTES.rh.demande);
    }
  };

  const handleClose = async () => {
    if (notification) {
      await markAsRead.mutateAsync(notification.id);
    }
    setOpen(false);
  };

  if (!notification) return null;

  const isApproved = notification.notification_type === 'REQUEST_COMPLETED';

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {isApproved ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-destructive" />
            )}
            <AlertDialogTitle className="text-lg">{notification.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            {notification.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <button
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 sm:w-auto"
          >
            Fermer
          </button>
          <AlertDialogAction onClick={handleView} className="sm:w-auto">
            Voir mes demandes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
