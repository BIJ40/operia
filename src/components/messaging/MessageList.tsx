import { useEffect, useRef } from 'react';
import { Message, TypingStatus } from '@/types/messaging';
import { MessageBubble } from './MessageBubble';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isGroupChat: boolean;
  typingUsers: TypingStatus[];
  isLoading?: boolean;
}

export function MessageList({ messages, currentUserId, isGroupChat, typingUsers, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-2xl`} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <p className="text-muted-foreground">
          Aucun message. Commencez la conversation !
        </p>
      </div>
    );
  }

  // Group messages by date and consecutive sender
  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  let currentDate: Date | null = null;
  let currentGroup: Message[] = [];

  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at);
    
    if (!currentDate || !isSameDay(currentDate, messageDate)) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate!, messages: [...currentGroup] });
      }
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }

    if (index === messages.length - 1 && currentGroup.length > 0) {
      groupedMessages.push({ date: currentDate, messages: [...currentGroup] });
    }
  });

  return (
    <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)]" ref={scrollAreaRef}>
      <div className="p-4 space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {formatDateSeparator(group.date)}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((message, messageIndex) => {
              const isOwnMessage = message.sender_id === currentUserId;
              const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const showSender = !prevMessage || prevMessage.sender_id !== message.sender_id;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showSender={showSender}
                  isGroupChat={isGroupChat}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>
              {typingUsers.map(t => t.user?.first_name || 'Quelqu\'un').join(', ')} écrit...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Aujourd\'hui';
  if (isYesterday(date)) return 'Hier';
  return format(date, 'd MMMM yyyy', { locale: fr });
}
