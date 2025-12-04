import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  onSend: (message: string) => void;
  onTyping?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatBox({ onSend, onTyping, isLoading, disabled, placeholder }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 5 lines (~120px)
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading || disabled) return;
    
    onSend(trimmed);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.();
  };

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="flex items-end gap-2 p-3 bg-background border-t">
      {/* Attachment button (placeholder for V2) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
        disabled={disabled}
      >
        <Paperclip className="h-5 w-5" />
      </Button>

      {/* Message input */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Écrivez votre message...'}
          disabled={disabled || isLoading}
          className={cn(
            'min-h-[80px] max-h-[120px] resize-none py-2.5 pr-12',
            'rounded-2xl border-muted-foreground/20'
          )}
          rows={3}
        />
      </div>

      {/* Send button */}
      <Button
        type="button"
        size="icon"
        onClick={handleSend}
        disabled={!canSend}
        className={cn(
          'h-10 w-10 shrink-0 rounded-full transition-all',
          canSend 
            ? 'bg-primary hover:bg-primary/90' 
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
