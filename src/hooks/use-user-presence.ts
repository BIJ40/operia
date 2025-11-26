import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const HEARTBEAT_INTERVAL = 30000; // 30 secondes
const OFFLINE_THRESHOLD = 60000; // 1 minute

export const useUserPresence = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let heartbeatInterval: NodeJS.Timeout;
    let isActive = true;

    const updatePresence = async (status: 'online' | 'offline') => {
      if (!isActive) return;

      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Erreur mise à jour présence:', error);
      }
    };

    // Marquer comme en ligne au démarrage
    updatePresence('online');

    // Heartbeat régulier
    heartbeatInterval = setInterval(() => {
      updatePresence('online');
    }, HEARTBEAT_INTERVAL);

    // Marquer comme hors ligne à la fermeture
    const handleBeforeUnload = async () => {
      isActive = false;
      await updatePresence('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      isActive = false;
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user]);
};
