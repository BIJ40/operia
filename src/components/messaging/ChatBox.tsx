import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatBoxProps {
  onSend: (message: string, attachments?: File[]) => void;
  onTyping?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  enableAttachments?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function ChatBox({ onSend, onTyping, isLoading, disabled, placeholder, enableAttachments }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if ((!trimmed && attachments.length === 0) || isLoading || disabled) return;
    
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la taille maximale (10MB)`);
        continue;
      }
      
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValidType) {
        toast.error(`${file.name}: type non supporté (PDF ou images uniquement)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isLoading && !disabled;

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    return <ImageIcon className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-background border-t">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg text-xs"
            >
              {getFileIcon(file)}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="p-0.5 hover:bg-background rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {enableAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}

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
    </div>
  );
}
