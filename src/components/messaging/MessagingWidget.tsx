import { useState } from 'react';
import { MessageCircle, X, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationsList } from '@/hooks/messaging/useConversationsList';
import { useConversation } from '@/hooks/messaging/useConversation';
import { useSendMessage } from '@/hooks/messaging/useSendMessage';
import { ConversationList, MessageList, ChatBox } from '@/components/messaging';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

export function MessagingWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Hooks
  const { data: conversations, isLoading: isLoadingList } = useConversationsList();
  const { 
    conversation, 
    messages, 
    typingUsers, 
    otherUser,
    isLoading: isLoadingConversation 
  } = useConversation(selectedConversationId);
  const { sendMessage, handleTyping, isLoading: isSending } = useSendMessage(selectedConversationId);

  // Handle send message
  const handleSendMessage = (content: string) => {
    sendMessage(content, {
      onError: () => toast.error('Erreur lors de l\'envoi du message'),
    });
  };

  // Handle back to list
  const handleBack = () => {
    setSelectedConversationId(null);
  };

  // Count unread messages
  const unreadCount = conversations?.reduce((count, conv) => count + (conv.unread_count || 0), 0) || 0;

  // Compact header for widget
  const renderCompactHeader = () => {
    if (!conversation) return null;
    
    const isGroup = conversation.type === 'group';
    const displayName = isGroup
      ? conversation.name || 'Groupe'
      : `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() || 'Utilisateur';

    const initials = isGroup
      ? (conversation.name?.[0] || 'G').toUpperCase()
      : `${otherUser?.first_name?.[0] || ''}${otherUser?.last_name?.[0] || ''}`.toUpperCase() || 'U';

    return (
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className={cn(
            'text-xs',
            isGroup ? 'bg-primary/20 text-primary' : 'bg-muted'
          )}>
            {isGroup ? <Users className="h-4 w-4" /> : initials}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm truncate flex-1">{displayName}</span>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Bubble button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative rounded-full transition-all duration-200 h-12 w-12",
          isOpen && "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute top-full right-0 mt-2 w-[380px] bg-background border rounded-xl shadow-2xl overflow-hidden z-50",
          "transition-all duration-300 ease-out origin-top-right",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Messages
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-[400px] flex flex-col">
          {selectedConversationId && conversation ? (
            <>
              {/* Compact conversation header */}
              {renderCompactHeader()}
              
              <MessageList
                messages={messages}
                currentUserId={user?.id || ''}
                isGroupChat={conversation.type === 'group'}
                typingUsers={typingUsers}
                isLoading={isLoadingConversation}
              />
              
              <ChatBox
                onSend={handleSendMessage}
                onTyping={handleTyping}
                isLoading={isSending}
                placeholder="Message..."
              />
            </>
          ) : (
            /* Conversation list */
            <div className="flex-1 overflow-auto">
              <ConversationList
                conversations={conversations || []}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                isLoading={isLoadingList}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
