/**
 * LiveSupportContext - Contexte partagé pour la session de support en direct
 * Permet de synchroniser l'état entre LiveSupportIndicator et GlobalLiveSupportManager
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface LiveSupportContextType {
  activeSession: LiveSession | null;
  hasActiveSession: boolean;
  isWaiting: boolean;
  isConnected: boolean;
  isLoading: boolean;
  showChatDialog: boolean;
  hasNewMessage: boolean;
  openChat: () => void;
  startNewSession: () => Promise<void>;
  closeChatDialog: () => void;
  closeSession: () => Promise<void>;
}

const LiveSupportContext = createContext<LiveSupportContextType | null>(null);

export function LiveSupportProvider({ children }: { children: ReactNode }) {
  const { user, firstName, lastName } = useAuth();
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
      .channel('live-session-status-ctx')
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
              setActiveSession(prev => {
                // Si un agent vient de prendre en charge, rouvrir automatiquement
                if (session.agent_id && !prev?.agent_id) {
                  setShowChatDialog(true);
                }
                return session;
              });
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
      .channel(`live-messages-ctx-${activeSession.id}`)
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

  const openChat = useCallback(() => {
    console.log('[LiveSupportContext] openChat called, hasActiveSession:', !!activeSession);
    if (activeSession) {
      setShowChatDialog(true);
      setHasNewMessage(false);
    }
  }, [activeSession]);

  const startNewSession = useCallback(async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté pour démarrer une session de support');
      return;
    }

    try {
      console.log('[LiveSupportContext] Starting new session for user:', user.id);
      
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

      console.log('[LiveSupportContext] New session created:', newSession);
      setActiveSession(newSession);
      setShowChatDialog(true);
      
      // Notifier le support
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

  const closeChatDialog = useCallback(() => {
    setShowChatDialog(false);
  }, []);

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

  const value: LiveSupportContextType = {
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

  return (
    <LiveSupportContext.Provider value={value}>
      {children}
    </LiveSupportContext.Provider>
  );
}

export function useLiveSupportContext() {
  const context = useContext(LiveSupportContext);
  if (!context) {
    throw new Error('useLiveSupportContext must be used within LiveSupportProvider');
  }
  return context;
}
