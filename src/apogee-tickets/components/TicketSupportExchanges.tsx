/**
 * Composant d'échanges bidirectionnels support ↔ utilisateur
 * Affiché dans un onglet du ticket projet
 */

import { useState, useRef, useEffect } from 'react';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { useTicketExchanges } from '../hooks/useTicketExchanges';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Loader2, User, HeadphonesIcon, Check, CheckCheck, Mail } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { successToast, errorToast } from '@/lib/toastHelpers';

interface TicketSupportExchangesProps {
  ticketId: string;
  initiatorUserId?: string | null;
  initiatorProfile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    agence?: string;
  } | null;
  isSupport?: boolean;
  ticketCreatedFrom?: string;
  className?: string;
}

export function TicketSupportExchanges({
  ticketId,
  initiatorUserId,
  initiatorProfile,
  isSupport = false,
  ticketCreatedFrom,
  className,
}: TicketSupportExchangesProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const showMailButton = isSupport && ticketCreatedFrom === 'email';

  const {
    exchanges,
    isLoading,
    unreadCount,
    sendMessage,
    isSending,
    markAllAsRead,
  } = useTicketExchanges({ ticketId });

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [exchanges]);

  // Mark as read once when component mounts with unread messages
  const hasMarkedRef = useRef(false);
  useEffect(() => {
    if (unreadCount > 0 && !hasMarkedRef.current) {
      hasMarkedRef.current = true;
      markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMessage(message.trim(), isSupport);
    setMessage('');
  };

  const handleSendWithEmail = async () => {
    if (!message.trim()) return;
    const msg = message.trim();
    setIsSendingEmail(true);
    try {
      await sendMessage(msg, isSupport);
      const { error } = await supabase.functions.invoke('reply-ticket-email', {
        body: { ticket_id: ticketId, message: msg },
      });
      if (error) throw error;
      successToast('Réponse envoyée par email au demandeur');
      setMessage('');
    } catch (err: any) {
      errorToast(err?.message || "Erreur lors de l'envoi email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <HeadphonesIcon className="w-4 h-4" />
            Échanges Support
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </div>
        
        {/* Affichage des infos du demandeur pour le support */}
        {isSupport && initiatorProfile && (
          <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
            <div className="font-medium">
              {initiatorProfile.first_name} {initiatorProfile.last_name}
            </div>
            {initiatorProfile.email && (
              <div className="text-muted-foreground">
                📧 <a href={`mailto:${initiatorProfile.email}`} className="hover:underline">
                  {initiatorProfile.email}
                </a>
              </div>
            )}
            {initiatorProfile.phone && (
              <div className="text-muted-foreground">
                📞 <a href={`tel:${initiatorProfile.phone}`} className="hover:underline">
                  {initiatorProfile.phone}
                </a>
              </div>
            )}
            {initiatorProfile.agence && (
              <div className="text-muted-foreground">
                🏢 {initiatorProfile.agence}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {exchanges.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <HeadphonesIcon className="w-8 h-8 mb-2 opacity-50" />
              <p>Aucun échange pour le moment</p>
              <p className="text-xs mt-1">Envoyez un message pour démarrer la conversation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exchanges.map((exchange) => {
                const isFromMe = exchange.sender_user_id === user?.id;
                const isFromSupportTeam = exchange.is_from_support;
                
                return (
                  <div
                    key={exchange.id}
                    className={cn(
                      "flex items-end gap-2",
                      isFromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isFromMe && (
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                        isFromSupportTeam ? "bg-primary/10" : "bg-muted"
                      )}>
                        {isFromSupportTeam ? (
                          <HeadphonesIcon className="w-4 h-4 text-primary" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2",
                        isFromMe
                          ? "bg-primary text-primary-foreground"
                          : isFromSupportTeam
                            ? "bg-accent border border-border"
                            : "bg-muted"
                      )}
                    >
                      {/* Sender name */}
                      {!isFromMe && exchange.sender && (
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {exchange.sender.first_name} {exchange.sender.last_name}
                        </div>
                      )}
                      
                      {/* Message */}
                      <p className="text-sm whitespace-pre-wrap">{exchange.message}</p>
                      
                      {/* Timestamp + read status */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1 text-xs",
                        isFromMe ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                      )}>
                        <span>
                          {formatDistanceToNow(new Date(exchange.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                        {isFromMe && (
                          exchange.read_at ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </div>
                    
                    {isFromMe && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        {isSupport ? (
                          <HeadphonesIcon className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-muted/30">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSupport ? "Répondre à l'utilisateur..." : "Votre message..."}
              className="min-h-[60px] resize-none"
              rows={2}
            />
            <div className="flex flex-col gap-1 self-end">
              <Button
                variant={showMailButton ? "outline" : "default"}
                size="sm"
                onClick={handleSend}
                disabled={!message.trim() || isSending || isSendingEmail}
                title="Répondre (interne)"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              {showMailButton && (
                <Button
                  size="sm"
                  onClick={handleSendWithEmail}
                  disabled={!message.trim() || isSending || isSendingEmail}
                  title="Répondre + envoyer par email"
                  className="gap-1"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span className="text-xs">+mail</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
