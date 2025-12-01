/**
 * Chatbot principal - Version refactorisée
 * Utilise des hooks et composants extraits pour la maintenabilité
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatbot } from '@/hooks/use-chatbot';
import { useChatbotRealtime } from '@/hooks/use-chatbot-realtime';
import { useChatbotDrag } from '@/hooks/use-chatbot-drag';
import { useChatbotTest } from '@/contexts/ChatbotTestContext';
import { ChatButton } from '@/components/chatbot/ChatButton';
import { ChatWindow } from '@/components/chatbot/ChatWindow';
import { SupportTicketDialog } from '@/components/chatbot/SupportTicketDialog';
import { ChatCloseDialog } from '@/components/chatbot/ChatCloseDialog';
import { supabase } from '@/integrations/supabase/client';
import { safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import { successToast } from '@/lib/toastHelpers';
import type { ChatContext } from '@/components/chatbot/ChatContextSelector';

// Re-export context for backward compatibility
export { ChatbotTestProvider, useChatbotTest } from '@/contexts/ChatbotTestContext';

export function Chatbot() {
  const { isAdmin, canAccessSupportConsole } = useAuth();
  const { isTestMode } = useChatbotTest();
  const [showChatCloseDialog, setShowChatCloseDialog] = useState(false);

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
    messagesEndRef,
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
    sendMessage,
    handleTyping,
    handleLinkClick,
    playNotificationSound,
    resetConversation,
  } = useChatbot();

  // Realtime subscriptions
  useChatbotRealtime({
    userId: user?.id,
    activeTicket,
    isOpen,
    setActiveTicket,
    setSupportMessages,
    setUnreadCount,
    setShowChoiceMode,
    setIsOpen,
    playNotificationSound,
  });

  // Drag & drop
  const { buttonRef, buttonPosition, isDragging, handleMouseDown } = useChatbotDrag(isOpen);

  // Hide chatbot for admins and support agents unless in test mode
  if ((isAdmin || canAccessSupportConsole) && !isTestMode) return null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsOpen(true);
    setUnreadCount(0);
  };

  const handleCloseWindow = () => {
    if (activeTicket) {
      setShowCloseConfirm(true);
    } else if (messages.length > 0) {
      setShowChatCloseDialog(true);
    } else {
      setIsOpen(false);
    }
  };

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
        logError('chatbot', 'Error updating ticket rating', ratingResult.error);
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
      logError('chatbot', 'Error closing ticket', closeResult.error);
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
        <ChatButton
          ref={buttonRef}
          position={buttonPosition}
          unreadCount={unreadCount}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
        />
      )}

      {/* Chat window */}
      {isOpen && (
        <ChatWindow
          position={buttonPosition}
          messages={messages}
          supportMessages={supportMessages}
          activeTicket={activeTicket}
          isLoading={isLoading}
          showChoiceMode={showChoiceMode}
          isCreating={isCreating}
          isUserTyping={isUserTyping}
          input={input}
          showTicketCreation={showTicketCreation}
          messagesEndRef={messagesEndRef}
          chatContext={chatContext}
          onClose={handleCloseWindow}
          onResetConversation={resetConversation}
          onSetInput={setInput}
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          onSelectTheme={(theme: ChatContext) => {
            setChatContext(theme);
            setShowChoiceMode(false);
          }}
          onCreateSupportTicket={async () => {
            const ticket = await createSupportTicket(messages);
            if (ticket) {
              setActiveTicket(ticket);
              setSupportMessages([]);
            }
          }}
          onWaitTimeout={handleWaitTimeout}
          onCreateTicketFromChat={createTicketFromChat}
          renderMessageWithLinks={renderMessageWithLinks}
        />
      )}

      {/* Support ticket close dialog */}
      <SupportTicketDialog
        showCloseConfirm={showCloseConfirm}
        ticketRating={ticketRating}
        ticketComment={ticketComment}
        onRatingChange={setTicketRating}
        onCommentChange={setTicketComment}
        onConfirmClose={handleConfirmClose}
        onCancel={() => setShowCloseConfirm(false)}
        onMinimize={() => {
          setIsOpen(false);
          setShowCloseConfirm(false);
        }}
        onConvertToTicket={activeTicket && activeTicket.type !== 'ticket' ? async () => {
          if (!activeTicket) return;
          const result = await safeMutation(
            supabase
              .from('support_tickets')
              .update({
                type: 'ticket',
                status: 'new',
              })
              .eq('id', activeTicket.id),
            'CHATBOT_CONVERT_TO_TICKET'
          );
          if (result.success) {
            setActiveTicket(null);
            setSupportMessages([]);
            setShowCloseConfirm(false);
            setIsOpen(false);
          }
        } : undefined}
      />

      {/* AI conversation close dialog */}
      <ChatCloseDialog
        open={showChatCloseDialog}
        onClose={() => setShowChatCloseDialog(false)}
        onMinimize={() => setIsOpen(false)}
        onCreateTicket={async () => {
          const ticket = await createSupportTicket(messages, 'ticket');
          if (ticket) {
            resetConversation();
            setIsOpen(false);
            successToast('Votre demande a été créée et sera traitée par notre équipe');
          }
        }}
        onEndChat={() => {
          resetConversation();
          setIsOpen(false);
        }}
      />
    </>
  );
}
