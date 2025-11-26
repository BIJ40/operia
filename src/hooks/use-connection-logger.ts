import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useConnectionLogger = () => {
  const { user } = useAuth();
  const connectionLogIdRef = useRef<string | null>(null);
  const connectedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!user) return;

    let isActive = true;

    const logConnection = async () => {
      if (!isActive) return;

      try {
        connectedAtRef.current = new Date();
        
        // Créer un log de connexion
        const { data, error } = await supabase
          .from('user_connection_logs')
          .insert({
            user_id: user.id,
            connected_at: connectedAtRef.current.toISOString(),
            user_agent: navigator.userAgent
          })
          .select('id')
          .single();

        if (error) throw error;
        
        connectionLogIdRef.current = data.id;
        console.log('📝 Connexion enregistrée:', data.id);
      } catch (error) {
        console.error('Erreur log connexion:', error);
      }
    };

    const logDisconnection = async () => {
      if (!connectionLogIdRef.current || !connectedAtRef.current) return;

      try {
        const disconnectedAt = new Date();
        const durationSeconds = Math.floor(
          (disconnectedAt.getTime() - connectedAtRef.current.getTime()) / 1000
        );

        await supabase
          .from('user_connection_logs')
          .update({
            disconnected_at: disconnectedAt.toISOString(),
            duration_seconds: durationSeconds
          })
          .eq('id', connectionLogIdRef.current);

        console.log('📝 Déconnexion enregistrée. Durée:', durationSeconds, 'secondes');
      } catch (error) {
        console.error('Erreur log déconnexion:', error);
      }
    };

    // Logger la connexion au montage
    logConnection();

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
  }, [user]);
};
