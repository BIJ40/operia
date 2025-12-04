import { useState } from 'react';
import { MessageCircle, X, ChevronDown, ArrowLeft, ChevronRight, Plus, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationsList, useCreateConversation } from '@/hooks/messaging/useConversationsList';
import { useConversation } from '@/hooks/messaging/useConversation';
import { useSendMessage } from '@/hooks/messaging/useSendMessage';
import { ConversationList, MessageList, ChatBox } from '@/components/messaging';
import { NewConversationModal } from '@/components/messaging/NewConversationModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MessagingWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newConversationType, setNewConversationType] = useState<'dm' | 'group'>('dm');

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
  const createConversation = useCreateConversation();

  // Handle send message
  const handleSendMessage = (content: string, attachments?: File[]) => {
    sendMessage(content, {
      onError: () => toast.error('Erreur lors de l\'envoi du message'),
    });
    // TODO: Handle attachments upload
    if (attachments && attachments.length > 0) {
      toast.info(`${attachments.length} fichier(s) joint(s) - upload en cours...`);
    }
  };

  // Handle back to list
  const handleBack = () => {
    setSelectedConversationId(null);
  };

  // Handle create DM
  const handleCreateDM = (userId: string) => {
    createConversation.mutate(
      { type: 'dm', member_ids: [userId] },
      {
        onSuccess: (conv) => {
          setSelectedConversationId(conv.id);
          setShowNewConversationModal(false);
          setShowSidePanel(false);
        },
        onError: () => toast.error('Erreur lors de la création de la conversation'),
      }
    );
  };

  // Handle create group
  const handleCreateGroup = (name: string, userIds: string[]) => {
    createConversation.mutate(
      { type: 'group', name, member_ids: userIds },
      {
        onSuccess: (conv) => {
          setSelectedConversationId(conv.id);
          setShowNewConversationModal(false);
          setShowSidePanel(false);
        },
        onError: () => toast.error('Erreur lors de la création du groupe'),
      }
    );
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

  // Side panel for creating conversations
  const renderSidePanel = () => (
    <div className={cn(
      "absolute left-0 top-0 bottom-0 w-[200px] bg-background border-r z-10",
      "transition-transform duration-200 ease-out",
      showSidePanel ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-3 border-b">
        <h4 className="font-semibold text-sm">Nouvelle conversation</h4>
      </div>
      <div className="p-2 space-y-1">
        <button
          onClick={() => {
            setNewConversationType('dm');
            setShowNewConversationModal(true);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
        >
          <User className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Message direct</span>
        </button>
        <button
          onClick={() => {
            setNewConversationType('group');
            setShowNewConversationModal(true);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
        >
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Créer un groupe</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Bubble button with label - P1 FIX: indicateur visible même fermé */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200",
          "bg-primary/10 hover:bg-primary/20 border border-primary/20",
          isOpen && "bg-primary text-primary-foreground",
          // Highlight si messages non lus et widget fermé
          !isOpen && unreadCount > 0 && "ring-2 ring-destructive/50 animate-pulse"
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <MessageCircle className="w-4 h-4 text-primary" />
        )}
        <span className={cn(
          "text-xs font-semibold uppercase tracking-wide",
          isOpen ? "text-primary-foreground" : "text-primary"
        )}>
          Messagerie interne
        </span>
        {/* Badge de messages non lus - toujours visible quand fermé */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

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
        {/* Side Panel */}
        {renderSidePanel()}

        {/* Main Content */}
        <div className={cn(
          "transition-all duration-200",
          showSidePanel && "ml-[200px]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {/* Accordion arrow to toggle side panel */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => setShowSidePanel(!showSidePanel)}
              >
                <ChevronRight className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  showSidePanel && "rotate-180"
                )} />
              </Button>
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Messages
              </h3>
            </div>
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
                  enableAttachments
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

      {/* New Conversation Modal */}
      <NewConversationModal
        open={showNewConversationModal}
        onOpenChange={setShowNewConversationModal}
        onCreateDM={handleCreateDM}
        onCreateGroup={handleCreateGroup}
        isCreating={createConversation.isPending}
      />
    </div>
  );
}
