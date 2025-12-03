import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserInfo, ConversationMember } from '@/types/messaging';
import { Skeleton } from '@/components/ui/skeleton';

interface AddMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMembers: ConversationMember[];
  onAdd: (userIds: string[]) => void;
  isAdding?: boolean;
}

export function AddMembersModal({
  open,
  onOpenChange,
  existingMembers,
  onAdd,
  isAdding,
}: AddMembersModalProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const existingMemberIds = existingMembers.map((m) => m.user_id);

  useEffect(() => {
    if (!open || !user?.id) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .single();

        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('is_active', true);

        if (currentProfile?.agency_id) {
          query = query.eq('agency_id', currentProfile.agency_id);
        }

        const { data } = await query.limit(50);
        // Filter out existing members
        const filtered = (data || []).filter((u) => !existingMemberIds.includes(u.id));
        setUsers(filtered);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [open, user?.id, existingMemberIds]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedUsers([]);
    }
  }, [open]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAdd = () => {
    if (selectedUsers.length === 0) return;
    onAdd(selectedUsers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des membres</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] mt-4 border rounded-lg">
          {isLoading ? (
            <div className="p-2 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {users.length === 0 ? 'Tous les utilisateurs sont déjà membres' : 'Aucun utilisateur trouvé'}
            </p>
          ) : (
            <div className="p-2 space-y-1">
              {filteredUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={selectedUsers.includes(u.id)}
                    onCheckedChange={() => handleToggleUser(u.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={selectedUsers.length === 0 || isAdding}>
            {isAdding ? 'Ajout...' : `Ajouter (${selectedUsers.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
