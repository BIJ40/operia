import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { logConnection } from '@/lib/logger';

export const useConnectionLogger = () => {
  const { user } = useAuthCore();
  // Use stable userId to prevent re-runs on tab switch (user object changes reference)
  const userId = user?.id;
  const connectionLogIdRef = useRef<string | null>(null);
  const connectedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isActive = true;

    const logUserConnection = async () => {
      if (!isActive) return;

      try {
        connectedAtRef.current = new Date();
        
        // Créer un log de connexion
        const { data, error } = await supabase
          .from('user_connection_logs')
          .insert({
            user_id: userId,
            connected_at: connectedAtRef.current.toISOString(),
            user_agent: navigator.userAgent
          })
          .select('id')
          .single();

        if (error) {
          // En cas d'erreur RLS ou autre, ne pas polluer la console en prod
          logConnection.warn('Erreur log connexion:', error.message);
          return;
        }
        
        connectionLogIdRef.current = data.id;
        logConnection.debug('Connexion enregistrée:', data.id);
      } catch (error) {
        // Silencieux en production
        logConnection.warn('Exception log connexion:', error);
      }
    };

    const logDisconnection = async () => {
      if (!connectionLogIdRef.current || !connectedAtRef.current) return;

      try {
        const disconnectedAt = new Date();
        const durationSeconds = Math.floor(
          (disconnectedAt.getTime() - connectedAtRef.current.getTime()) / 1000
        );

        const { error } = await supabase
          .from('user_connection_logs')
          .update({
            disconnected_at: disconnectedAt.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', connectionLogIdRef.current);

        if (error) {
          // Silencieux en production
          logConnection.warn('Erreur log déconnexion:', error.message);
          return;
        }

        logConnection.debug('Déconnexion enregistrée. Durée:', durationSeconds, 'secondes');
      } catch (error) {
        // Silencieux en production
        logConnection.warn('Exception log déconnexion:', error);
      }
    };

    // Logger la connexion au montage
    logUserConnection();

    // Logger la déconnexion à la fermeture
    const handleBeforeUnload = () => {
      isActive = false;
      logDisconnection();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      isActive = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      logDisconnection();
    };
  }, [userId]); // Stable: only re-run on actual user change (login/logout)
};
