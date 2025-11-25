import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupportMessage } from '@/hooks/use-admin-support';

interface SupportChatProps {
  messages: SupportMessage[];
  newMessage: string;
  isUserTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
}

export function SupportChat({
  messages,
  newMessage,
  isUserTyping,
  messagesEndRef,
  onMessageChange,
  onSendMessage,
}: SupportChatProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.is_from_support ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.is_from_support
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {format(new Date(msg.created_at), 'HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          ))}
          {isUserTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground italic">
                  L'utilisateur est en train de taper...
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            className="flex-1"
          />
          <Button onClick={onSendMessage} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
