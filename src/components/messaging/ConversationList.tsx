import { Conversation } from '@/types/messaging';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Trash2, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, onDelete, isLoading }: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Aucune conversation</p>
        <p className="text-sm text-muted-foreground">Créez une nouvelle discussion</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isSelected={selectedId === conversation.id}
          onClick={() => onSelect(conversation.id)}
          onDelete={onDelete ? () => onDelete(conversation.id) : undefined}
        />
      ))}
    </div>
  );
}

function ConversationItem({ 
  conversation, 
  isSelected, 
  onClick,
  onDelete 
}: { 
  conversation: Conversation; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete?: () => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const displayName = conversation.type === 'dm' 
    ? `${conversation.other_user?.first_name || ''} ${conversation.other_user?.last_name || ''}`.trim() || 'Utilisateur'
    : conversation.name || 'Groupe';

  const initials = conversation.type === 'dm'
    ? `${conversation.other_user?.first_name?.[0] || ''}${conversation.other_user?.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : (conversation.name?.[0] || 'G').toUpperCase();

  const lastMessage = conversation.last_message;
  const lastMessageTime = conversation.last_message_at 
    ? formatMessageTime(new Date(conversation.last_message_at))
    : '';

  const lastMessagePreview = lastMessage?.content 
    ? lastMessage.content.length > 40 
      ? `${lastMessage.content.substring(0, 40)}...` 
      : lastMessage.content
    : 'Aucun message';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete?.();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left cursor-pointer group',
          isSelected && 'bg-accent',
          conversation.is_pinned && 'border-l-2 border-l-primary'
        )}
      >
        <Avatar className="h-12 w-12">
          <AvatarFallback className={cn(
            'text-sm font-medium',
            conversation.type === 'group' ? 'bg-primary/20 text-primary' : 'bg-muted'
          )}>
            {conversation.type === 'group' ? <Users className="h-5 w-5" /> : initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{lastMessageTime}</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground truncate">{lastMessagePreview}</span>
            {(conversation.unread_count || 0) > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-full">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent rounded">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette conversation sera supprimée uniquement de votre liste. Les autres participants pourront toujours la voir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: fr });
  }
  if (isYesterday(date)) {
    return 'Hier';
  }
  return format(date, 'dd/MM', { locale: fr });
}
