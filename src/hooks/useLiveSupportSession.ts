/**
 * Hook pour gérer la session de support en direct active
 * Permet d'accéder directement à une conversation existante sans passer par la recherche
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LiveSession {
  id: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  user_name?: string;
}

export function useLiveSupportSession() {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la session active au démarrage
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadActiveSession = async () => {
      try {
        const { data, error } = await supabase
          .from('live_support_sessions')
          .select('id, status, agent_id, created_at')
          .eq('user_id', user.id)
          .in('status', ['waiting', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setActiveSession(data);
      } catch (err) {
        console.error('Error loading live session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadActiveSession();

    // Écouter les changements de session en temps réel
    const channel = supabase
      .channel('live-session-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_support_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as LiveSession;
            if (session.status === 'closed') {
              setActiveSession(null);
            } else {
              setActiveSession(session);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Créer une nouvelle session
  const startSession = useCallback(async (userName: string) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('live_support_sessions')
        .insert({
          user_id: user.id,
          user_name: userName,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;
      setActiveSession(data);
      return data;
    } catch (err) {
      console.error('Error starting session:', err);
      return null;
    }
  }, [user?.id]);

  // Fermer la session
  const closeSession = useCallback(async () => {
    if (!activeSession?.id) return;

    try {
      await supabase
        .from('live_support_sessions')
        .update({ status: 'closed' })
        .eq('id', activeSession.id);

      setActiveSession(null);
    } catch (err) {
      console.error('Error closing session:', err);
    }
  }, [activeSession?.id]);

  return {
    activeSession,
    hasActiveSession: !!activeSession,
    isWaiting: activeSession?.status === 'waiting',
    isConnected: activeSession?.status === 'active',
    isLoading,
    startSession,
    closeSession,
  };
}
