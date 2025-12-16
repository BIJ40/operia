/**
 * Hook pour transformer un ticket support en ticket Gestion de Projet (apogee_tickets)
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { safeMutation } from '@/lib/safeQuery';
import { successToast, errorToast } from '@/lib/toastHelpers';
import { useQueryClient } from '@tanstack/react-query';

interface SupportTicketData {
  id: string;
  subject: string;
  user_id: string;
  service?: string | null;
  category?: string | null;
  chatbot_conversation?: any;
}

export function useTransformToProjectTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTransforming, setIsTransforming] = useState(false);

  const transformToProjectTicket = async (supportTicket: SupportTicketData): Promise<string | null> => {
    if (!user) {
      errorToast('Vous devez être connecté');
      return null;
    }

    setIsTransforming(true);
    try {
      // Mapper le service support vers un module Apogée si applicable
      const moduleMapping: Record<string, string> = {
        'bug_app': 'apogee',
        'feature': 'apogee',
        'question': 'apogee',
      };
      const mappedModule = supportTicket.service ? moduleMapping[supportTicket.service] || null : null;

      // Construire la description à partir de la conversation chatbot si disponible
      let description = supportTicket.subject;
      if (supportTicket.chatbot_conversation && Array.isArray(supportTicket.chatbot_conversation)) {
        const userMessages = supportTicket.chatbot_conversation
          .filter((msg: any) => msg.role === 'user')
          .map((msg: any) => msg.content)
          .join('\n\n');
        if (userMessages) {
          description = `${supportTicket.subject}\n\n--- Messages utilisateur ---\n${userMessages}`;
        }
      }

      // Créer le ticket dans apogee_tickets avec le statut BACKLOG
      const result = await safeMutation<{ id: string }>(
        supabase
          .from('apogee_tickets')
          .insert({
            element_concerne: supportTicket.subject,
            description: description,
            kanban_status: 'BACKLOG',
            created_from: 'support',
            created_by_user_id: user.id,
            source_support_ticket_id: supportTicket.id,
            support_initiator_user_id: supportTicket.user_id,
            module: mappedModule,
            heat_priority: 6, // Priorité normale par défaut
            needs_completion: true, // À qualifier
            reported_by: 'agence', // Remonté par une agence via support
          } as any)
          .select('id')
          .single(),
        'TRANSFORM_SUPPORT_TO_PROJECT'
      );

      if (!result.success || !result.data) {
        errorToast(result.error?.message || 'Erreur lors de la transformation');
        return null;
      }

      // Fermer automatiquement le ticket support après transformation
      await supabase
        .from('support_tickets')
        .update({
          status: 'closed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', supportTicket.id);

      // Invalider les queries pour rafraîchir les listes
      queryClient.invalidateQueries({ queryKey: ['apogee-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });

      successToast('Ticket transformé et fermé');
      return result.data.id;
    } catch (error) {
      errorToast('Erreur inattendue lors de la transformation');
      return null;
    } finally {
      setIsTransforming(false);
    }
  };

  return {
    transformToProjectTicket,
    isTransforming,
  };
}
