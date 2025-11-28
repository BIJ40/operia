import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { SupportMessage } from '@/hooks/use-admin-support';
import { InternalNoteToggle } from './InternalNoteToggle';
import { TicketMessageItem } from './TicketMessageItem';

interface SupportChatProps {
  messages: SupportMessage[];
  newMessage: string;
  isUserTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isInternalNote?: boolean;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onInternalNoteChange?: (checked: boolean) => void;
}

export function SupportChat({
  messages,
  newMessage,
  isUserTyping,
  messagesEndRef,
  isInternalNote = false,
  onMessageChange,
  onSendMessage,
  onInternalNoteChange,
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
            <TicketMessageItem
              key={msg.id}
              message={{
                ...msg,
                is_internal_note: (msg as any).is_internal_note,
              }}
            />
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
      <div className="border-t p-4 space-y-2">
        {/* Toggle note interne */}
        {onInternalNoteChange && (
          <InternalNoteToggle
            isInternalNote={isInternalNote}
            onToggle={onInternalNoteChange}
          />
        )}
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInternalNote ? "Écrire une note interne..." : "Tapez votre message..."}
            className={`flex-1 ${isInternalNote ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''}`}
          />
          <Button 
            onClick={onSendMessage} 
            disabled={!newMessage.trim()}
            variant={isInternalNote ? 'outline' : 'default'}
            className={isInternalNote ? 'border-amber-400 text-amber-600 hover:bg-amber-100' : ''}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
