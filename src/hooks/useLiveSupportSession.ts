/**
 * Hook pour gérer la session de support en direct active
 * Permet d'accéder directement à une conversation existante sans passer par la recherche
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LiveSession {
  id: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  user_name?: string;
}

export function useLiveSupportSession() {
  const { user, firstName, lastName, agence } = useAuth();
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
    console.log('[LiveSupport] openChat called, hasActiveSession:', !!activeSession);
    if (activeSession) {
      setShowChatDialog(true);
      setHasNewMessage(false);
    }
  }, [activeSession]);

  // Démarrer une nouvelle session de support
  const startNewSession = useCallback(async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté pour démarrer une session de support');
      return;
    }

    try {
      console.log('[LiveSupport] Starting new session for user:', user.id);
      
      // Créer une nouvelle session
      const { data: newSession, error } = await supabase
        .from('live_support_sessions')
        .insert({
          user_id: user.id,
          status: 'active',
          user_name: firstName 
            ? `${firstName} ${lastName || ''}`.trim() 
            : user.email?.split('@')[0] || 'Utilisateur',
        })
        .select('id, status, agent_id, created_at')
        .single();

      if (error) throw error;

      console.log('[LiveSupport] New session created:', newSession);
      setActiveSession(newSession);
      setShowChatDialog(true);
      
      // Notifier le support qu'une nouvelle session est en attente
      try {
        await supabase.functions.invoke('notify-live-support', {
          body: { 
            sessionId: newSession.id,
            userName: firstName || user.email?.split('@')[0] || 'Utilisateur',
          }
        });
      } catch (notifyError) {
        console.warn('Could not notify support agents:', notifyError);
      }

      toast.success('Session de support démarrée');
    } catch (err) {
      console.error('Error starting live session:', err);
      toast.error('Impossible de démarrer la session de support');
    }
  }, [user?.id, user?.email, firstName, lastName]);

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
    startNewSession,
    closeChatDialog,
    closeSession,
  };
}