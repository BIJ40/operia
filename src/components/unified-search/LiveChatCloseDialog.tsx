/**
 * LiveChatCloseDialog - Dialog pour fermer une session live côté utilisateur
 * Propose: Résolu, Non résolu, Transformer en ticket
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface LiveChatCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onClosed: () => void;
}

export function LiveChatCloseDialog({
  open,
  onOpenChange,
  sessionId,
  onClosed,
}: LiveChatCloseDialogProps) {
  const { user, firstName, lastName } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  const userName = `${firstName || ''} ${lastName || ''}`.trim() || 'Utilisateur';

  // Fermer comme "résolu"
  const handleResolved = async () => {
    setIsClosing(true);
    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: 'user',
          closed_reason: 'Résolu par l\'utilisateur',
        } as any)
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Conversation terminée');
      onOpenChange(false);
      onClosed();
    } catch (error) {
      logError(error, 'LIVE_CHAT_CLOSE_RESOLVED');
      toast.error('Erreur lors de la fermeture');
    } finally {
      setIsClosing(false);
    }
  };

  // Fermer comme "non résolu" (archive quand même mais avec raison différente)
  const handleNotResolved = async () => {
    setIsClosing(true);
    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: 'user',
          closed_reason: 'Non résolu - fermé par l\'utilisateur',
        } as any)
        .eq('id', sessionId);

      if (error) throw error;

      toast.info('Conversation fermée');
      onOpenChange(false);
      onClosed();
    } catch (error) {
      logError(error, 'LIVE_CHAT_CLOSE_NOT_RESOLVED');
      toast.error('Erreur lors de la fermeture');
    } finally {
      setIsClosing(false);
    }
  };

  // Transformer en ticket support
  const handleTransformToTicket = async () => {
    if (!user?.id) return;
    
    setIsTransforming(true);
    try {
      // Récupérer les messages de la session
      const { data: messages, error: msgError } = await supabase
        .from('live_support_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Récupérer les infos de la session
      const { data: session, error: sessionError } = await supabase
        .from('live_support_sessions')
        .select('agency_slug')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Formater l'historique du chat
      const chatHistory = (messages || []).map(m => ({
        role: m.is_from_support ? 'support' : 'user',
        content: m.content,
        sender: m.sender_name,
        timestamp: m.created_at,
      }));

      // Sujet basé sur le premier message utilisateur
      const firstUserMessage = messages?.find(m => !m.is_from_support);
      const subject = firstUserMessage?.content?.substring(0, 100) || 'Demande depuis le chat en direct';

      // Créer le ticket
      const ticketData = {
        user_id: user.id,
        subject: subject,
        status: 'new',
        heat_priority: 6,
        source: 'chat',
        type: 'chat_human',
        agency_slug: session.agency_slug || null,
        chatbot_conversation: chatHistory,
        support_level: 1,
      };

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert(ticketData)
        .select('id')
        .single();

      if (ticketError) throw ticketError;

      // Ajouter une note dans le ticket
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: `Ticket créé depuis une conversation en direct.\n\nHistorique de la conversation:\n${(messages || []).map(m => `[${m.is_from_support ? 'Agent' : userName}] ${m.content}`).join('\n')}`,
          is_from_support: false,
          is_internal_note: true,
        });

      // Mettre à jour la session
      const { error: updateError } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'converted',
          closed_at: new Date().toISOString(),
          closed_by: 'user',
          closed_reason: 'Converti en ticket par l\'utilisateur',
        } as any)
        .eq('id', sessionId);

      if (updateError) {
        console.error('[LiveChatCloseDialog] Session update error:', updateError);
      }

      toast.success('Votre demande a été transformée en ticket');
      onOpenChange(false);
      onClosed();
    } catch (error) {
      logError(error, 'LIVE_CHAT_TO_TICKET');
      toast.error('Erreur lors de la création du ticket');
    } finally {
      setIsTransforming(false);
    }
  };

  const isProcessing = isClosing || isTransforming;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Terminer la conversation</AlertDialogTitle>
          <AlertDialogDescription>
            Votre problème a-t-il été résolu ?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          {/* Option: Résolu */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-green-500/30 hover:bg-green-500/10"
            onClick={handleResolved}
            disabled={isProcessing}
          >
            {isClosing && !isTransforming ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
            )}
            <div className="text-left">
              <p className="font-medium">Oui, c'est résolu</p>
              <p className="text-xs text-muted-foreground">
                La conversation sera archivée
              </p>
            </div>
          </Button>

          {/* Option: Non résolu */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-orange-500/30 hover:bg-orange-500/10"
            onClick={handleNotResolved}
            disabled={isProcessing}
          >
            {isClosing && !isTransforming ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <XCircle className="w-5 h-5 mr-3 text-orange-500" />
            )}
            <div className="text-left">
              <p className="font-medium">Non, pas encore résolu</p>
              <p className="text-xs text-muted-foreground">
                Fermer quand même la conversation
              </p>
            </div>
          </Button>

          {/* Option: Transformer en ticket */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-helpconfort-blue/30 hover:bg-helpconfort-blue/10"
            onClick={handleTransformToTicket}
            disabled={isProcessing}
          >
            {isTransforming ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <Ticket className="w-5 h-5 mr-3 text-helpconfort-blue" />
            )}
            <div className="text-left">
              <p className="font-medium">Créer un ticket</p>
              <p className="text-xs text-muted-foreground">
                Suivi formel avec historique de la conversation
              </p>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Annuler
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
