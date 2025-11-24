import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant' | 'support';
  content: string;
}

export const useSupportTicket = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createSupportTicket = async (messages: Message[]) => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour créer un ticket',
        variant: 'destructive',
      });
      return null;
    }

    setIsCreating(true);
    try {
      // Récupérer le pseudo de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('pseudo')
        .eq('id', user.id)
        .single();

      const userPseudo = profile?.pseudo || 'Utilisateur';

      // Extraire la dernière question de l'utilisateur
      const userMessages = messages.filter(m => m.role === 'user');
      const lastQuestion = userMessages[userMessages.length - 1]?.content || 'Demande de support';

      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_pseudo: userPseudo,
          status: 'waiting',
          priority: 'urgent',
          chatbot_conversation: messages as any,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Envoyer la notification email aux supports
      const appUrl = window.location.origin;
      
      const { error: notifyError } = await supabase.functions.invoke('notify-support-ticket', {
        body: {
          ticketId: ticket.id,
          userPseudo: userPseudo,
          lastQuestion: lastQuestion,
          appUrl: appUrl,
        },
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
        // On continue même si la notification échoue
      }

      toast({
        title: 'Ticket créé !',
        description: 'Un conseiller va vous répondre très rapidement.',
      });

      return ticket.id;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le ticket support',
        variant: 'destructive',
      });
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
