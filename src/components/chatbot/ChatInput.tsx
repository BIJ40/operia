import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, UserCircle } from 'lucide-react';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  activeTicket: any;
  messages: any[];
  showChoiceMode: boolean;
  isCreating: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onCreateSupportTicket: () => void;
  onTyping?: () => void;
}

export function ChatInput({
  input,
  isLoading,
  activeTicket,
  messages,
  showChoiceMode,
  isCreating,
  onInputChange,
  onSendMessage,
  onCreateSupportTicket,
  onTyping,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <>
      {/* Support button */}
      {messages.length > 0 && !activeTicket && !showChoiceMode && (
        <div className="px-4 pt-2 pb-2 border-t">
          <Button
            onClick={onCreateSupportTicket}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <UserCircle className="h-4 w-4 mr-2" />
            {isCreating ? 'Création...' : 'Parler à un conseiller'}
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              onTyping?.();
            }}
            onKeyPress={handleKeyPress}
            placeholder={
              activeTicket
                ? 'Répondre au conseiller...'
                : 'Tapez votre message...'
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={onSendMessage} disabled={!input.trim() || isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
