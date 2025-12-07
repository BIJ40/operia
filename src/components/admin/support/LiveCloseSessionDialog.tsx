/**
 * LiveCloseSessionDialog - Dialog pour fermer une session live
 * Propose deux options: Résolu (archive) ou Transformer en ticket
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
import { Loader2, CheckCircle, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

interface LiveMessage {
  id: string;
  content: string;
  sender_name: string;
  is_from_support: boolean;
  created_at: string;
}

interface LiveCloseSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  userId: string;
  userName: string;
  agencySlug: string | null;
  messages: LiveMessage[];
  onClosed: () => void;
}

export function LiveCloseSessionDialog({
  open,
  onOpenChange,
  sessionId,
  userId,
  userName,
  agencySlug,
  messages,
  onClosed,
}: LiveCloseSessionDialogProps) {
  const { user, firstName, lastName } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Nom de l'agent
  const agentName = `${firstName || ''} ${lastName || ''}`.trim() || 'Agent';

  // Fermer la session comme "résolue" (archive)
  const handleResolve = async () => {
    setIsClosing(true);
    try {
      const { error } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          agent_name: agentName,
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session fermée et archivée');
      onOpenChange(false);
      onClosed();
    } catch (error) {
      logError(error, 'LIVE_SESSION_CLOSE');
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
      // Formater l'historique du chat pour le ticket (format JSON valide)
      const chatHistory = messages.map(m => ({
        role: m.is_from_support ? 'support' : 'user',
        content: m.content,
        sender: m.sender_name,
        timestamp: m.created_at,
      }));

      // Créer le ticket avec l'historique
      const subject = messages.find(m => !m.is_from_support)?.content?.substring(0, 100) 
        || 'Conversation live support';

      // Préparer les données du ticket - status/type conformes aux check constraints
      const ticketData = {
        user_id: userId,
        subject: subject,
        status: 'new',
        heat_priority: 6,
        source: 'chat',
        type: 'chat_human',
        agency_slug: agencySlug || null,
        chatbot_conversation: chatHistory,
        support_level: 1,
        assigned_to: user.id,
      };

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert(ticketData)
        .select('id')
        .single();

      if (ticketError) {
        console.error('[LiveCloseSessionDialog] Ticket creation error:', ticketError);
        throw ticketError;
      }

      // Ajouter un message système dans le ticket
      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: `Ticket créé depuis une conversation live support.\n\nHistorique de la conversation:\n${messages.map(m => `[${m.is_from_support ? 'Agent' : userName}] ${m.content}`).join('\n')}`,
          is_from_support: true,
          is_internal_note: true,
        });

      // Fermer la session live avec statut "converted"
      const { error: updateError } = await supabase
        .from('live_support_sessions')
        .update({ 
          status: 'converted',
          closed_at: new Date().toISOString(),
          agent_name: agentName,
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('[LiveCloseSessionDialog] Session update error:', updateError);
      }

      toast.success('Session convertie en ticket');
      onOpenChange(false);
      onClosed();
    } catch (error) {
      logError(error, 'LIVE_SESSION_TO_TICKET');
      console.error('[LiveCloseSessionDialog] Full error:', error);
      toast.error('Erreur lors de la conversion');
    } finally {
      setIsTransforming(false);
    }
  };

  const isProcessing = isClosing || isTransforming;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Fermer la session de chat</AlertDialogTitle>
          <AlertDialogDescription>
            Comment souhaitez-vous clôturer cette conversation avec {userName} ?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          {/* Option: Résolu */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4 px-4 border-green-500/30 hover:bg-green-500/10"
            onClick={handleResolve}
            disabled={isProcessing}
          >
            {isClosing ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
            )}
            <div className="text-left">
              <p className="font-medium">Résolu</p>
              <p className="text-xs text-muted-foreground">
                La conversation est archivée, le problème est résolu
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
              <p className="font-medium">Transformer en ticket</p>
              <p className="text-xs text-muted-foreground">
                Crée un ticket avec l'historique du chat pour suivi ultérieur
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
