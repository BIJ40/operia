import { ScrollArea } from '@/components/ui/scroll-area';

type Message = {
  role: 'user' | 'assistant' | 'support';
  content: string;
  created_at?: string;
};

interface ChatHistoryProps {
  messages: Message[];
  supportMessages: any[];
  activeTicket: any;
  isLoading: boolean;
  showChoiceMode: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isUserTyping: boolean;
  onRenderMessageWithLinks: (content: string) => React.ReactNode;
}

export function ChatHistory({
  messages,
  supportMessages,
  activeTicket,
  isLoading,
  showChoiceMode,
  messagesEndRef,
  isUserTyping,
  onRenderMessageWithLinks,
}: ChatHistoryProps) {
  if (activeTicket) {
    return (
      <ScrollArea className="flex-1 p-4">
        {/* Historique Mme Michu */}
        {activeTicket.chatbot_conversation &&
          activeTicket.chatbot_conversation.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-muted-foreground text-center mb-3 py-2 border-b">
                Conversation avec Mme MICHU
              </div>
              {activeTicket.chatbot_conversation.map((msg: any, idx: number) => (
                <div
                  key={`history-${idx}`}
                  className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <div
                    className={`inline-block max-w-[80%] p-3 rounded-lg opacity-70 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        {/* Messages support */}
        {supportMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-block bg-muted p-4 rounded-lg max-w-[80%]">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeTicket.status === 'waiting'
                    ? 'Patientez quelques instants, un conseiller va se connecter...'
                    : 'Conseiller connecté - Vous pouvez échanger'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground text-center mb-3 py-2 border-b">
              Conversation avec le support
            </div>
          </div>
        )}
        {supportMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 ${msg.is_from_support ? 'text-left' : 'text-right'}`}
          >
            <div
              className={`inline-block max-w-[80%] p-3 rounded-lg ${
                msg.is_from_support
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
            </div>
          </div>
        ))}
        {isUserTyping && (
          <div className="text-left">
            <div className="inline-block bg-muted p-3 rounded-lg">
              <div className="text-sm text-muted-foreground italic">
                Le conseiller est en train de taper...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      {messages.length === 0 && !showChoiceMode && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Demandez à Mme Michu !
        </div>
      )}
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
        >
          <div
            className={`inline-block max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">
              {msg.role === 'assistant'
                ? onRenderMessageWithLinks(msg.content)
                : msg.content}
            </div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="text-left">
          <div className="inline-block bg-muted p-3 rounded-lg">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </ScrollArea>
  );
}
