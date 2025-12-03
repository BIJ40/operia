import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationsList, useCreateConversation } from '@/hooks/messaging/useConversationsList';
import { useConversation } from '@/hooks/messaging/useConversation';
import { useSendMessage } from '@/hooks/messaging/useSendMessage';
import { useGroupMembers } from '@/hooks/messaging/useGroupMembers';
import {
  ConversationList,
  MessageList,
  ConversationHeader,
  ChatBox,
  GroupMembersPanel,
  NewConversationModal,
  AddMembersModal,
  RenameGroupModal,
} from '@/components/messaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Messages() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isMobileViewingConversation, setIsMobileViewingConversation] = useState(false);

  // Hooks
  const { data: conversations, isLoading: isLoadingList, search, setSearch } = useConversationsList();
  const { 
    conversation, 
    messages, 
    members, 
    typingUsers, 
    currentMembership, 
    otherUser,
    isLoading: isLoadingConversation 
  } = useConversation(selectedConversationId);
  const { sendMessage, handleTyping, isLoading: isSending } = useSendMessage(selectedConversationId);
  const { addMembers, removeMember, leaveGroup, updateRole, renameGroup, isAddingMembers } = useGroupMembers(selectedConversationId);
  const createConversation = useCreateConversation();

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setIsMobileViewingConversation(true);
  };

  // Handle back navigation on mobile
  const handleBack = () => {
    setIsMobileViewingConversation(false);
    setSelectedConversationId(null);
  };

  // Handle create DM
  const handleCreateDM = async (userId: string) => {
    try {
      const conv = await createConversation.mutateAsync({
        type: 'dm',
        member_ids: [userId],
      });
      setSelectedConversationId(conv.id);
      setIsMobileViewingConversation(true);
      setShowNewModal(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la conversation');
    }
  };

  // Handle create group
  const handleCreateGroup = async (name: string, userIds: string[]) => {
    try {
      const conv = await createConversation.mutateAsync({
        type: 'group',
        name,
        member_ids: userIds,
      });
      setSelectedConversationId(conv.id);
      setIsMobileViewingConversation(true);
      setShowNewModal(false);
    } catch (error) {
      toast.error('Erreur lors de la création du groupe');
    }
  };

  // Handle send message
  const handleSendMessage = (content: string) => {
    sendMessage(content, {
      onError: () => toast.error('Erreur lors de l\'envoi du message'),
    });
  };

  // Handle add members
  const handleAddMembers = (userIds: string[]) => {
    addMembers(userIds, {
      onSuccess: () => setShowAddMembersModal(false),
    });
  };

  // Handle rename group
  const handleRenameGroup = (name: string) => {
    renameGroup(name, {
      onSuccess: () => setShowRenameModal(false),
    });
  };

  // Handle leave group
  const handleLeaveGroup = () => {
    if (window.confirm('Voulez-vous vraiment quitter ce groupe ?')) {
      leaveGroup(undefined, {
        onSuccess: () => {
          setSelectedConversationId(null);
          setIsMobileViewingConversation(false);
        },
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List - Left Panel */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 border-r flex flex-col bg-background',
          isMobileViewingConversation ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Messages</h1>
            <Button size="icon" variant="ghost" onClick={() => setShowNewModal(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          <ConversationList
            conversations={conversations || []}
            selectedId={selectedConversationId}
            onSelect={handleSelectConversation}
            isLoading={isLoadingList}
          />
        </div>
      </div>

      {/* Conversation View - Center Panel */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-background',
          !isMobileViewingConversation && !selectedConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedConversationId && conversation ? (
          <>
            <ConversationHeader
              conversation={conversation}
              otherUser={otherUser}
              currentMembership={currentMembership}
              onBack={handleBack}
              onShowMembers={() => setShowMembersPanel(true)}
              onRename={() => setShowRenameModal(true)}
              onLeave={handleLeaveGroup}
              onAddMembers={() => setShowAddMembersModal(true)}
              showBackButton={isMobileViewingConversation}
            />

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
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-medium mb-2">Vos messages</h2>
            <p className="text-muted-foreground mb-4">
              Sélectionnez une conversation ou créez-en une nouvelle
            </p>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle conversation
            </Button>
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      <NewConversationModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onCreateDM={handleCreateDM}
        onCreateGroup={handleCreateGroup}
        isCreating={createConversation.isPending}
      />

      {conversation && (
        <>
          <GroupMembersPanel
            open={showMembersPanel}
            onOpenChange={setShowMembersPanel}
            members={members}
            currentUserId={user?.id || ''}
            currentUserRole={currentMembership?.role}
            onRemoveMember={removeMember}
            onPromoteMember={(userId, role) => updateRole({ userId, role })}
            onAddMembers={() => {
              setShowMembersPanel(false);
              setShowAddMembersModal(true);
            }}
          />

          <AddMembersModal
            open={showAddMembersModal}
            onOpenChange={setShowAddMembersModal}
            existingMembers={members}
            onAdd={handleAddMembers}
            isAdding={isAddingMembers}
          />

          <RenameGroupModal
            open={showRenameModal}
            onOpenChange={setShowRenameModal}
            currentName={conversation.name || ''}
            onRename={handleRenameGroup}
          />
        </>
      )}
    </div>
  );
}
