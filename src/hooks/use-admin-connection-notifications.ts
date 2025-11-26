import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ConnectionLog {
  id: string;
  user_id: string;
  connected_at: string;
}

export const useAdminConnectionNotifications = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) return;

    console.log('🔔 Admin: écoute des notifications de connexion');

    const channel = supabase
      .channel('connection_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_connection_logs'
        },
        async (payload) => {
          const log = payload.new as ConnectionLog;
          
          try {
            // Récupérer les infos du profil utilisateur
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email, agence')
              .eq('id', log.user_id)
              .single();

            if (profile) {
              const userName = [profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(' ') || profile.email || 'Utilisateur inconnu';

              const agenceInfo = profile.agence ? ` (${profile.agence})` : '';

              toast({
                title: '🟢 Nouvelle connexion',
                description: `${userName}${agenceInfo} vient de se connecter`,
                duration: 5000,
              });

              console.log('🔔 Notification connexion:', userName);
            }
          } catch (error) {
            console.error('Erreur notification connexion:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);
};
