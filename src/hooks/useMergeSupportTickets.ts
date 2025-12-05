import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { successToast, errorToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

interface MergeOptions {
  mergeMessages: boolean;
  mergeAttachments: boolean;
}

export function useMergeSupportTickets() {
  const [isMerging, setIsMerging] = useState(false);

  const mergeSupportTickets = async (
    mainTicketId: string,
    duplicateTicketId: string,
    options: MergeOptions
  ): Promise<boolean> => {
    setIsMerging(true);
    
    try {
      // 1. Merge messages if requested
      if (options.mergeMessages) {
        const { data: messages, error: msgError } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', duplicateTicketId);

        if (msgError) throw msgError;

        if (messages && messages.length > 0) {
          // Insert messages with prefix indicating merge source
          for (const msg of messages) {
            await supabase.from('support_messages').insert({
              ticket_id: mainTicketId,
              sender_id: msg.sender_id,
              message: `[Fusionné] ${msg.message}`,
              is_from_support: msg.is_from_support,
              is_internal_note: msg.is_internal_note,
              created_at: msg.created_at,
            });
          }
        }
      }

      // 2. Merge attachments if requested
      if (options.mergeAttachments) {
        await supabase
          .from('support_attachments')
          .update({ ticket_id: mainTicketId })
          .eq('ticket_id', duplicateTicketId);
      }

      // 3. Mark duplicate ticket as merged and change status
      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          merged_into_ticket_id: mainTicketId,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', duplicateTicketId);

      if (updateError) throw updateError;

      // 4. Add a system message to the main ticket
      await supabase.from('support_messages').insert({
        ticket_id: mainTicketId,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        message: `Ticket fusionné avec #${duplicateTicketId.substring(0, 8)}`,
        is_from_support: true,
        is_internal_note: true,
      });

      successToast('Tickets fusionnés avec succès');
      return true;
    } catch (error) {
      logError(error, 'MERGE_SUPPORT_TICKETS');
      errorToast('Erreur lors de la fusion des tickets');
      return false;
    } finally {
      setIsMerging(false);
    }
  };

  return {
    mergeSupportTickets,
    isMerging,
  };
}
