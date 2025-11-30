import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError, logWarn } from '@/lib/logger';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { errorToast } from '@/lib/toastHelpers';

interface Message {
  role: 'user' | 'assistant' | 'support';
  content: string;
}

interface TicketCreatedData {
  id: string;
  user_id: string;
  status: string;
  priority: string;
  chatbot_conversation: any;
  created_at: string;
  updated_at: string;
}

export const useSupportTicket = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const createSupportTicket = async (messages: Message[], ticketType: 'chat_ai' | 'chat_human' | 'ticket' = 'chat_ai'): Promise<TicketCreatedData | null> => {
    if (!user) {
      errorToast('Vous devez être connecté pour créer un ticket');
      return null;
    }

    setIsCreating(true);
    try {
      // Récupérer le nom de l'utilisateur
      const profileResult = await safeQuery<{ first_name: string | null; last_name: string | null; agence: string | null }>(
        supabase
          .from('profiles')
          .select('first_name, last_name, agence')
          .eq('id', user.id)
          .maybeSingle(),
        'SUPPORT_TICKET_PROFILE_LOAD'
      );

      const profile = profileResult.data;
      const userName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Utilisateur';

      // Extraire la dernière question de l'utilisateur
      const userMessages = messages.filter(m => m.role === 'user');
      const lastQuestion = userMessages[userMessages.length - 1]?.content || 'Demande de support';

      // Créer la demande avec le type V2.5
      const ticketResult = await safeMutation<TicketCreatedData>(
        supabase
          .from('support_tickets')
          .insert({
            user_id: user.id,
            subject: lastQuestion.substring(0, 100),
            status: 'new',
            priority: ticketType === 'chat_ai' ? 'urgent' : 'normal',
            source: 'chat',
            type: ticketType,
            agency_slug: profile?.agence || null,
            chatbot_conversation: messages.map(m => ({ role: m.role, content: m.content })),
            support_level: 1,
          } as any)
          .select()
          .single(),
        'SUPPORT_TICKET_CREATE'
      );

      if (!ticketResult.success || !ticketResult.data) {
        errorToast(ticketResult.error || 'Impossible de créer le ticket support');
        return null;
      }

      const ticket = ticketResult.data;

      // Envoyer la notification email aux supports (non-bloquant)
      const appUrl = window.location.origin;
      
      const notifyResult = await safeInvoke(
        supabase.functions.invoke('notify-support-ticket', {
          body: {
            ticketId: ticket.id,
            userName: userName,
            lastQuestion: lastQuestion,
            appUrl: appUrl,
          },
        }),
        'SUPPORT_TICKET_NOTIFY'
      );

      if (!notifyResult.success) {
        logWarn('[SUPPORT-TICKET] Error sending notification (non-blocking)', notifyResult.error);
        // On continue même si la notification échoue
      }

      return ticket;
    } catch (error) {
      logError('[SUPPORT-TICKET] Unexpected error creating ticket', error);
      errorToast('Impossible de créer le ticket support');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createSupportTicket,
    isCreating,
  };
};
