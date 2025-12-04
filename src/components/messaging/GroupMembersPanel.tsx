import { ConversationMember } from '@/types/messaging';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Crown, Shield, MoreVertical, UserMinus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupMembersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ConversationMember[];
  currentUserId: string;
  currentUserRole?: 'owner' | 'admin' | 'member';
  onRemoveMember?: (userId: string) => void;
  onPromoteMember?: (userId: string, role: 'admin' | 'member') => void;
  onAddMembers?: () => void;
}

export function GroupMembersPanel({
  open,
  onOpenChange,
  members,
  currentUserId,
  currentUserRole,
  onRemoveMember,
  onPromoteMember,
  onAddMembers,
}: GroupMembersPanelProps) {
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span>Membres ({members.length})</span>
            {canManage && onAddMembers && (
              <Button variant="outline" size="sm" onClick={onAddMembers}>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="divide-y">
            {sortedMembers.map((member) => {
              const user = member.user;
              const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Utilisateur';
              const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U';
              const isCurrentUser = member.user_id === currentUserId;

              return (
                <div key={member.id} className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{fullName}</span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">Vous</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <RoleBadge role={member.role} />
                    </div>
                  </div>

                  {canManage && !isCurrentUser && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Plus d'options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background">
                        {isOwner && (
                          <DropdownMenuItem
                            onClick={() => onPromoteMember?.(member.user_id, member.role === 'admin' ? 'member' : 'admin')}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            {member.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onRemoveMember?.(member.user_id)}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Retirer du groupe
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function RoleBadge({ role }: { role: 'owner' | 'admin' | 'member' }) {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <Crown className="h-3 w-3" />
        Propriétaire
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
        <Shield className="h-3 w-3" />
        Administrateur
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Membre</span>
  );
}
