import { useEffect, useState, createContext, useContext } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/hooks/use-chatbot';
import { ChatHistory } from '@/components/chatbot/ChatHistory';
import { ChatInput } from '@/components/chatbot/ChatInput';
import { ChatModeSelector } from '@/components/chatbot/ChatModeSelector';
import { ChatContextSelector } from '@/components/chatbot/ChatContextSelector';
import { SupportTicketDialog } from '@/components/chatbot/SupportTicketDialog';
import { TimeoutModal } from '@/components/chatbot/TimeoutModal';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import chatIcon from '@/assets/logo_chat.png';
import { MessageCircle } from 'lucide-react';

// Context for admin test mode
interface ChatbotTestContextType {
  isTestMode: boolean;
  setTestMode: (value: boolean) => void;
}

const ChatbotTestContext = createContext<ChatbotTestContextType>({
  isTestMode: false,
  setTestMode: () => {},
});

export const useChatbotTest = () => useContext(ChatbotTestContext);

// Provider component
export function ChatbotTestProvider({ children }: { children: React.ReactNode }) {
  const [isTestMode, setTestMode] = useState(false);
  return (
    <ChatbotTestContext.Provider value={{ isTestMode, setTestMode }}>
      {children}
    </ChatbotTestContext.Provider>
  );
}

export function Chatbot() {
  const { isAdmin, canAccessSupportConsole } = useAuth();
  const { isTestMode } = useChatbotTest();

  const {
    user,
    isOpen,
    messages,
    input,
    isLoading,
    showCloseConfirm,
    activeTicket,
    supportMessages,
    unreadCount,
    isUserTyping,
    ticketRating,
    ticketComment,
    showChoiceMode,
    showTicketCreation,
    buttonPosition,
    isDragging,
    messagesEndRef,
    buttonRef,
    createSupportTicket,
    createTicketFromChat,
    isCreating,
    handleWaitTimeout,
    chatContext,
    setChatContext,
    setIsOpen,
    setInput,
    setShowCloseConfirm,
    setActiveTicket,
    setSupportMessages,
    setUnreadCount,
    setTicketRating,
    setTicketComment,
    setShowChoiceMode,
    setShowTicketCreation,
    setButtonPosition,
    setIsDragging,
    setDragOffset,
    sendMessage,
    handleTyping,
    handleLinkClick,
    playNotificationSound,
    dragOffset,
    setMessages,
    resetConversation,
  } = useChatbot();

  // Check for active ticket
  useEffect(() => {
    if (!user) return;

    const checkActiveTicket = async () => {
      // Utiliser les nouveaux statuts : new, in_progress, waiting_user
      const ticketResult = await safeQuery<any[]>(
        supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['new', 'in_progress', 'waiting_user'])
          .order('created_at', { ascending: false })
          .limit(1),
        'CHATBOT_ACTIVE_TICKET_CHECK'
      );

      if (!ticketResult.success) {
        logError('rag-chat', 'Error checking active ticket', ticketResult.error);
        return;
      }

      const data = ticketResult.data;

      if (data && data.length > 0) {
        setActiveTicket(data[0]);
        setShowChoiceMode(false);
        setIsOpen(true);

        const messagesResult = await safeQuery<any[]>(
          supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', data[0].id)
            .order('created_at', { ascending: true }),
          'CHATBOT_TICKET_MESSAGES_LOAD'
        );

        if (!messagesResult.success) {
          logError('rag-chat', 'Error loading ticket messages', messagesResult.error);
          return;
        }

        if (messagesResult.data) setSupportMessages(messagesResult.data);
      }
    };

    checkActiveTicket();
  }, [user]);

  // Realtime: support messages
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          setSupportMessages((prev) => [...prev, payload.new]);
          if (payload.new.is_from_support) {
            playNotificationSound();
            if (!isOpen) setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, isOpen]);

  // Realtime: typing indicator
  useEffect(() => {
    if (!activeTicket) return;

    const typingChannel = supabase.channel(`typing:${activeTicket.id}`);

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const supportTyping = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.is_support && p.typing)
        );
        // setIsUserTyping(supportTyping); // Vous devrez exposer cette fonction depuis le hook
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({
            user_id: user?.id,
            is_support: false,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [activeTicket, user]);

  // Realtime: ticket updates
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${activeTicket.id}`,
        },
        (payload) => {
          if (payload.new.status === 'resolved') {
            setActiveTicket(null);
            setSupportMessages([]);
            setUnreadCount(0);
            setShowChoiceMode(true);
            setIsOpen(false);
          } else {
            setActiveTicket(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket]);


  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOpen) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = e.clientX - rect.left;
    const buttonWidth = rect.width;
    const isDragZone = relativeX > buttonWidth * 0.75;

    if (isDragZone) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
    setUnreadCount(0);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const buttonSize = 80;

      const newRight = windowWidth - e.clientX - dragOffset.x - buttonSize;
      const newBottom = windowHeight - e.clientY - dragOffset.y - buttonSize;

      const clampedRight = Math.max(0, Math.min(windowWidth - buttonSize, newRight));
      const clampedBottom = Math.max(0, Math.min(windowHeight - buttonSize, newBottom));

      setButtonPosition({ right: clampedRight, bottom: clampedBottom });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('chatbot-position', JSON.stringify(buttonPosition));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, buttonPosition]);

  // Hide chatbot for admins and support agents unless in test mode
  if ((isAdmin || canAccessSupportConsole) && !isTestMode) return null;

  const renderMessageWithLinks = (content: string) => {
    const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, index) => {
      const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [, text, url] = linkMatch;
        return (
          <button
            key={index}
            onClick={() => handleLinkClick(url)}
            className="text-primary hover:underline font-medium inline-flex items-center gap-1 mx-1"
          >
            👉 {text.trim()}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleConfirmClose = async () => {
    if (!activeTicket) return;

    if (ticketRating > 0) {
      const ratingResult = await safeMutation(
        supabase
          .from('support_tickets')
          .update({
            rating: ticketRating,
            rating_comment: ticketComment || null,
          })
          .eq('id', activeTicket.id),
        'CHATBOT_TICKET_RATING_UPDATE'
      );

      if (!ratingResult.success) {
        logError('rag-chat', 'Error updating ticket rating', ratingResult.error);
        // Continue to close ticket anyway
      }
    }

    const closeResult = await safeMutation(
      supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', activeTicket.id),
      'CHATBOT_TICKET_CLOSE'
    );

    if (!closeResult.success) {
      logError('rag-chat', 'Error closing ticket', closeResult.error);
      // Still reset UI state
    }

    setShowCloseConfirm(false);
    setActiveTicket(null);
    setSupportMessages([]);
    setTicketRating(0);
    setTicketComment('');
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          data-chatbot-trigger
          style={{
            position: 'fixed',
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            zIndex: 9999,
          }}
          className="relative px-6 py-3 rounded-full shadow-2xl hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] hover:scale-105 hover:-translate-y-1 transition-all duration-300 overflow-visible bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark group flex items-center gap-3 before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full cursor-grab group-hover:opacity-100 opacity-0 transition-opacity pointer-events-none">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full"></div>
          </div>

          <MessageCircle className="h-6 w-6 text-white flex-shrink-0 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-white font-semibold text-sm whitespace-nowrap relative z-10">
            Demander de l'aide en direct
          </span>

          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg border-2 border-background pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: `${buttonPosition.bottom}px`,
            right: `${buttonPosition.right}px`,
            zIndex: 9999,
          }}
          className="w-80 h-[500px] bg-card border-2 rounded-lg shadow-xl flex flex-col animate-slide-in-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-sm">Helpbox!</h3>
            </div>
            <div className="flex items-center gap-1">
              {/* Reset conversation button - only show when there are messages and no active ticket */}
              {messages.length > 0 && !activeTicket && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={resetConversation}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Nouvelle conversation</TooltipContent>
                </Tooltip>
              )}
              <Button
                onClick={() => {
                  if (activeTicket) {
                    setShowCloseConfirm(true);
                  } else {
                    setIsOpen(false);
                  }
                }}
                variant="ghost"
                size="icon"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          {showChoiceMode && !activeTicket && messages.length === 0 ? (
            <ChatModeSelector
              isCreating={isCreating}
              onSelectAI={() => setShowChoiceMode(false)}
              onSelectSupport={async () => {
                setShowChoiceMode(false);
                const ticket = await createSupportTicket([]);
                if (ticket) {
                  setActiveTicket(ticket);
                  setSupportMessages([]);
                }
              }}
            />
          ) : (
            <>
              {/* Context selector - only show when not in support ticket mode */}
              {!activeTicket && (
                <ChatContextSelector
                  selectedContext={chatContext}
                  onSelectContext={setChatContext}
                />
              )}
              
              <ChatHistory
                messages={messages}
                supportMessages={supportMessages}
                activeTicket={activeTicket}
                isLoading={isLoading}
                showChoiceMode={showChoiceMode}
                messagesEndRef={messagesEndRef}
                isUserTyping={isUserTyping}
                onRenderMessageWithLinks={renderMessageWithLinks}
              />

              {showTicketCreation && activeTicket && (
                <TimeoutModal
                  open={showTicketCreation}
                  onWait={handleWaitTimeout}
                  onCreateTicket={(category, subject, description) => {
                    createTicketFromChat(category, subject, description);
                  }}
                />
              )}

              <ChatInput
                input={input}
                isLoading={isLoading}
                activeTicket={activeTicket}
                messages={messages}
                showChoiceMode={showChoiceMode}
                isCreating={isCreating}
                onInputChange={setInput}
                onSendMessage={sendMessage}
                onCreateSupportTicket={async () => {
                  const ticket = await createSupportTicket(messages);
                  if (ticket) {
                    setActiveTicket(ticket);
                    setSupportMessages([]);
                  }
                }}
                onTyping={handleTyping}
              />
            </>
          )}
        </div>
      )}

      <SupportTicketDialog
        showCloseConfirm={showCloseConfirm}
        ticketRating={ticketRating}
        ticketComment={ticketComment}
        onRatingChange={setTicketRating}
        onCommentChange={setTicketComment}
        onConfirmClose={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </>
  );
}
