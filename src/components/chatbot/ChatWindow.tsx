import { useNavigate } from 'react-router-dom';
import { X, RotateCcw, Maximize2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { ChatModeSelector } from './ChatModeSelector';
import { TimeoutModal } from './TimeoutModal';
import { ROUTES } from '@/config/routes';
import type { ChatContext } from './ChatContextSelector';

interface ChatWindowProps {
  position: { right: number; bottom: number };
  messages: any[];
  supportMessages: any[];
  activeTicket: any;
  isLoading: boolean;
  showChoiceMode: boolean;
  isCreating: boolean;
  isUserTyping: boolean;
  input: string;
  showTicketCreation: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatContext: string;
  onClose: () => void;
  onResetConversation: () => void;
  onSetInput: (value: string) => void;
  onSendMessage: () => void;
  onTyping: () => void;
  onSelectTheme: (theme: ChatContext) => void;
  onCreateSupportTicket: () => Promise<void>;
  onWaitTimeout: () => void;
  onCreateTicketFromChat: (category: string, subject: string, description: string) => void;
  renderMessageWithLinks: (content: string) => React.ReactNode;
}

export function ChatWindow({
  position,
  messages,
  supportMessages,
  activeTicket,
  isLoading,
  showChoiceMode,
  isCreating,
  isUserTyping,
  input,
  showTicketCreation,
  messagesEndRef,
  onClose,
  onResetConversation,
  onSetInput,
  onSendMessage,
  onTyping,
  onSelectTheme,
  onCreateSupportTicket,
  onWaitTimeout,
  onCreateTicketFromChat,
  renderMessageWithLinks,
}: ChatWindowProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${position.bottom}px`,
        right: `${position.right}px`,
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
          {/* Expand button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  onClose();
                  navigate(ROUTES.support.index);
                }}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Ouvrir le centre d'aide"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ouvrir le centre d'aide</TooltipContent>
          </Tooltip>
          
          {/* Reset conversation button */}
          {messages.length > 0 && !activeTicket && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onResetConversation}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Nouvelle conversation"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nouvelle conversation</TooltipContent>
            </Tooltip>
          )}
          
          <Button onClick={onClose} variant="ghost" size="icon" aria-label="Fermer le chat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {showChoiceMode && !activeTicket && messages.length === 0 ? (
        <ChatModeSelector
          isCreating={isCreating}
          onSelectTheme={onSelectTheme}
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

          {showTicketCreation && activeTicket && (
            <TimeoutModal
              open={showTicketCreation}
              onWait={onWaitTimeout}
              onCreateTicket={onCreateTicketFromChat}
            />
          )}

          <ChatInput
            input={input}
            isLoading={isLoading}
            activeTicket={activeTicket}
            messages={messages}
            showChoiceMode={showChoiceMode}
            isCreating={isCreating}
            onInputChange={onSetInput}
            onSendMessage={onSendMessage}
            onCreateSupportTicket={onCreateSupportTicket}
            onTyping={onTyping}
          />
        </>
      )}
    </div>
  );
}
