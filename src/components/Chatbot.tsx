import { useEffect } from 'react';
import { X, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useChatbot } from '@/hooks/use-chatbot';
import { ChatHistory } from '@/components/chatbot/ChatHistory';
import { ChatInput } from '@/components/chatbot/ChatInput';
import { ChatModeSelector } from '@/components/chatbot/ChatModeSelector';
import { SupportTicketDialog } from '@/components/chatbot/SupportTicketDialog';
import chatIcon from '@/assets/logo_chat.png';

export function Chatbot() {
  const {
    isAdmin,
    isSupport,
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
    buttonPosition,
    isDragging,
    messagesEndRef,
    buttonRef,
    createSupportTicket,
    isCreating,
    setIsOpen,
    setInput,
    setShowCloseConfirm,
    setActiveTicket,
    setSupportMessages,
    setUnreadCount,
    setTicketRating,
    setTicketComment,
    setShowChoiceMode,
    setButtonPosition,
    setIsDragging,
    setDragOffset,
    sendMessage,
    handleTyping,
    handleLinkClick,
    playNotificationSound,
    dragOffset,
    setMessages,
  } = useChatbot();

  // Hide chatbot for admins and support
  if (isAdmin || isSupport) return null;

  // Check for active ticket
  useEffect(() => {
    if (!user) return;

    const checkActiveTicket = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['waiting', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveTicket(data[0]);
        setShowChoiceMode(false);
        setIsOpen(true);

        const { data: msgs } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', data[0].id)
          .order('created_at', { ascending: true });

        if (msgs) setSupportMessages(msgs);
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

  // Auto-open after 30s
  useEffect(() => {
    const hasOpenedInSession = sessionStorage.getItem('chatbot-auto-opened');

    if (!hasOpenedInSession) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem('chatbot-auto-opened', 'true');
        setMessages([{
          role: 'assistant',
          content: "Youhouuuuuu c'est Madame Michu, je peux vous aider ?",
        }]);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, []);

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
      await supabase
        .from('support_tickets')
        .update({
          rating: ticketRating,
          rating_comment: ticketComment || null,
        })
        .eq('id', activeTicket.id);
    }

    await supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', activeTicket.id);

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
          className="relative h-20 w-20 rounded-full shadow-2xl hover:scale-110 transition-transform overflow-visible bg-gradient-to-br from-helpconfort-blue-light via-helpconfort-blue-dark to-primary animate-pulse group"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/4 h-full cursor-grab group-hover:opacity-100 opacity-0 transition-opacity pointer-events-none">
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/50 rounded-full"></div>
          </div>

          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-helpconfort-blue-light via-primary to-helpconfort-blue-dark animate-spin-slow opacity-75 blur-sm pointer-events-none"
            style={{ padding: '3px' }}
          ></div>

          <div className="relative h-full w-full rounded-full bg-gradient-to-br from-helpconfort-blue-light to-helpconfort-blue-dark flex items-center justify-center shadow-inner pointer-events-none">
            <img
              src={chatIcon}
              alt="Chat"
              className="w-10 h-10 pointer-events-none select-none drop-shadow-lg"
              draggable="false"
            />
          </div>

          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center animate-pulse shadow-lg border-2 border-background pointer-events-none">
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
              {activeTicket ? (
                <>
                  <Headphones className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">Support Client</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeTicket.status === 'waiting'
                        ? 'En attente...'
                        : 'Conseiller connecté'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <img src={chatIcon} alt="Chat" className="h-6 w-6" />
                  <h3 className="font-semibold text-sm">Mme MICHU</h3>
                </>
              )}
            </div>
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
