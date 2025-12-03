import { cn } from '@/lib/utils';
import { Message } from '@/types/messaging';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSender: boolean;
  isGroupChat: boolean;
}

export function MessageBubble({ message, isOwnMessage, showSender, isGroupChat }: MessageBubbleProps) {
  const senderName = message.sender 
    ? `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  // Get user color (fallback to default)
  const userColor = (message.sender as any)?.color || (message.sender as any)?.bgcolor;
  
  const getBubbleStyle = () => {
    if (isOwnMessage) {
      return {
        backgroundColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
      };
    }
    
    if (userColor) {
      // Use user color with transparency for better readability
      return {
        backgroundColor: userColor,
        color: '#fff',
        borderLeft: `4px solid ${userColor}`,
      };
    }
    
    return {
      backgroundColor: 'hsl(var(--muted))',
      color: 'hsl(var(--foreground))',
    };
  };

  return (
    <div
      className={cn(
        'flex flex-col max-w-[80%]',
        isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {showSender && isGroupChat && !isOwnMessage && (
        <span 
          className="text-xs font-medium mb-1 px-2"
          style={{ color: userColor || 'hsl(var(--muted-foreground))' }}
        >
          {senderName}
        </span>
      )}
      
      <div
        className={cn(
          'px-4 py-2 rounded-2xl shadow-sm',
          isOwnMessage 
            ? 'rounded-br-md' 
            : 'rounded-bl-md'
        )}
        style={getBubbleStyle()}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
      
      <span className="text-[10px] text-muted-foreground mt-1 px-2">
        {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
      </span>
    </div>
  );
}
