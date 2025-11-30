import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Headphones } from 'lucide-react';

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
    <div className="border-t">
      {/* Input */}
      <div className="p-3">
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

      {/* Support button - always visible when in AI chat mode */}
      {!activeTicket && !showChoiceMode && (
        <div className="px-3 pb-3">
          <Button
            onClick={onCreateSupportTicket}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="w-full text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/50"
          >
            <Headphones className="h-4 w-4 mr-2" />
            {isCreating ? 'Connexion...' : 'Contacter le support'}
          </Button>
        </div>
      )}
    </div>
  );
}
