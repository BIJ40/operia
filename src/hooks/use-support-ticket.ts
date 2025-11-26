import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant' | 'support';
  content: string;
}

interface TicketCreatedData {
  id: string;
  user_id: string;
  user_pseudo: string;
  status: string;
  priority: string;
  chatbot_conversation: any;
  created_at: string;
  updated_at: string;
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
      // Récupérer le nom de l'utilisateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      const userName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Utilisateur';

      // Extraire la dernière question de l'utilisateur
      const userMessages = messages.filter(m => m.role === 'user');
      const lastQuestion = userMessages[userMessages.length - 1]?.content || 'Demande de support';

      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_pseudo: userName,
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
          userName: userName,
          lastQuestion: lastQuestion,
          appUrl: appUrl,
        },
      });

      if (notifyError) {
        console.error('Error sending notification:', notifyError);
        // On continue même si la notification échoue
      }

      // NE PAS afficher de toast ici - c'est géré dans le Chatbot
      // pour éviter de fermer le chat

      return ticket;
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
