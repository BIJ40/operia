import { Conversation, ConversationMember, UserInfo } from '@/types/messaging';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, MoreVertical, Users, Edit, LogOut, UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationHeaderProps {
  conversation: Conversation;
  otherUser?: UserInfo | null;
  currentMembership?: ConversationMember;
  onBack: () => void;
  onShowMembers: () => void;
  onRename?: () => void;
  onLeave?: () => void;
  onAddMembers?: () => void;
  showBackButton?: boolean;
}

export function ConversationHeader({
  conversation,
  otherUser,
  currentMembership,
  onBack,
  onShowMembers,
  onRename,
  onLeave,
  onAddMembers,
  showBackButton = true,
}: ConversationHeaderProps) {
  const isGroup = conversation.type === 'group';
  const canManage = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  const displayName = isGroup
    ? conversation.name || 'Groupe'
    : `${otherUser?.first_name || ''} ${otherUser?.last_name || ''}`.trim() || 'Utilisateur';

  const initials = isGroup
    ? (conversation.name?.[0] || 'G').toUpperCase()
    : `${otherUser?.first_name?.[0] || ''}${otherUser?.last_name?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="flex items-center gap-3 p-3 border-b bg-background">
      {showBackButton && (
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      <button 
        onClick={isGroup ? onShowMembers : undefined}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            isGroup ? 'bg-primary/20 text-primary' : 'bg-muted'
          )}>
            {isGroup ? <Users className="h-5 w-5" /> : initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 text-left">
          <p className="font-medium truncate">{displayName}</p>
          {isGroup && (
            <p className="text-xs text-muted-foreground">
              Appuyez pour voir les membres
            </p>
          )}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-background">
          {isGroup && (
            <>
              <DropdownMenuItem onClick={onShowMembers}>
                <Users className="h-4 w-4 mr-2" />
                Voir les membres
              </DropdownMenuItem>

              {canManage && (
                <>
                  <DropdownMenuItem onClick={onAddMembers}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter des membres
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRename}>
                    <Edit className="h-4 w-4 mr-2" />
                    Renommer le groupe
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              {currentMembership?.role !== 'owner' && (
                <DropdownMenuItem onClick={onLeave} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Quitter le groupe
                </DropdownMenuItem>
              )}
            </>
          )}

          {!isGroup && (
            <DropdownMenuItem disabled>
              <Trash2 className="h-4 w-4 mr-2" />
              Archiver
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
