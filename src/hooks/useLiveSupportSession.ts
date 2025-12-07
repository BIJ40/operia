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
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Charger la session active au démarrage
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadActiveSession = async () => {
      try {
        // Chercher les sessions "active" (pas encore closed)
        const { data, error } = await supabase
          .from('live_support_sessions')
          .select('id, status, agent_id, created_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
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
    const sessionChannel = supabase
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
              setShowChatDialog(false);
            } else {
              setActiveSession(session);
              // Si un agent vient de prendre en charge, rouvrir automatiquement
              if (session.agent_id && !activeSession?.agent_id) {
                setShowChatDialog(true);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [user?.id]);

  // Écouter les nouveaux messages pour rouvrir le dialog automatiquement
  useEffect(() => {
    if (!activeSession?.id) return;

    const messageChannel = supabase
      .channel(`live-messages-${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_support_messages',
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          const newMessage = payload.new as { sender_type: string };
          // Si message d'agent et dialog fermé, rouvrir automatiquement
          if (newMessage.sender_type === 'agent' && !showChatDialog) {
            setShowChatDialog(true);
            setHasNewMessage(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [activeSession?.id, showChatDialog]);

  // Ouvrir le dialog de chat
  const openChat = useCallback(() => {
    setShowChatDialog(true);
    setHasNewMessage(false);
  }, []);

  // Fermer le dialog de chat (sans fermer la session)
  const closeChatDialog = useCallback(() => {
    setShowChatDialog(false);
  }, []);

  // Fermer la session complètement
  const closeSession = useCallback(async () => {
    if (!activeSession?.id) return;

    try {
      await supabase
        .from('live_support_sessions')
        .update({ status: 'closed' })
        .eq('id', activeSession.id);

      setActiveSession(null);
      setShowChatDialog(false);
    } catch (err) {
      console.error('Error closing session:', err);
    }
  }, [activeSession?.id]);

  return {
    activeSession,
    hasActiveSession: !!activeSession,
    isWaiting: activeSession?.status === 'active' && !activeSession?.agent_id,
    isConnected: activeSession?.status === 'active' && !!activeSession?.agent_id,
    isLoading,
    showChatDialog,
    hasNewMessage,
    openChat,
    closeChatDialog,
    closeSession,
  };
}
