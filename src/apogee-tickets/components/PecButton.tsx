/**
 * Bouton "Informer P.E.C" (Prise En Charge)
 * Envoie un email pré-rédigé au demandeur pour l'informer que le ticket est pris en charge.
 * Visible uniquement pour les tickets d'origine email.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { successToast, errorToast } from '@/lib/toastHelpers';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface PecButtonProps {
  ticketId: string;
  ticketCreatedFrom?: string;
  requesterName?: string;
  subject?: string;
  className?: string;
}

function buildPecMessage(requesterName?: string, subject?: string): string {
  return `Bonjour${requesterName ? ` ${requesterName}` : ''},

Nous accusons bonne réception de votre demande${subject ? ` concernant "${subject}"` : ''} et vous confirmons sa prise en charge par notre équipe.

Nous étudions actuellement la situation et ne manquerons pas de vous tenir informé(e) de l'avancement.

N'hésitez pas à répondre à cet email si vous avez des éléments complémentaires à nous transmettre.

Cordialement,
L'équipe Support Apogée / Help!Confort`;
}

export function PecButton({ ticketId, ticketCreatedFrom, requesterName, subject, className }: PecButtonProps) {
  const [isSending, setIsSending] = useState(false);

  if (ticketCreatedFrom !== 'email') return null;

  const handleSend = async () => {
    setIsSending(true);
    try {
      const message = buildPecMessage(requesterName, subject);

      // Save as internal exchange too
      const { error: insertError } = await supabase
        .from('apogee_ticket_support_exchanges' as any)
        .insert({
          ticket_id: ticketId,
          message: `📧 P.E.C envoyée:\n\n${message}`,
          is_from_support: true,
          sender_user_id: (await supabase.auth.getUser()).data.user?.id,
        });
      if (insertError) console.warn('Exchange insert warning:', insertError);

      const { error } = await supabase.functions.invoke('reply-ticket-email', {
        body: { ticket_id: ticketId, message },
      });
      if (error) throw error;
      successToast('Email de prise en charge envoyé');
    } catch (err: any) {
      errorToast(err?.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSend}
      disabled={isSending}
      className={className}
      title="Envoyer un email de prise en charge au demandeur"
    >
      {isSending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
      )}
      Informer P.E.C
    </Button>
  );
}
