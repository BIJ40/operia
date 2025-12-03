import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserInfo } from '@/types/messaging';
import { Skeleton } from '@/components/ui/skeleton';

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDM: (userId: string) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
  isCreating?: boolean;
}

export function NewConversationModal({
  open,
  onOpenChange,
  onCreateDM,
  onCreateGroup,
  isCreating,
}: NewConversationModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load users from same agency
  useEffect(() => {
    if (!open || !user?.id) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // Get current user's agency
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('agency_id')
          .eq('id', user.id)
          .single();

        // Get users from same agency
        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .neq('id', user.id)
          .eq('is_active', true);

        if (currentProfile?.agency_id) {
          query = query.eq('agency_id', currentProfile.agency_id);
        }

        const { data } = await query.limit(50);
        setUsers(data || []);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [open, user?.id]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setGroupName('');
      setSelectedUsers([]);
      setTab('dm');
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

  const handleCreateDM = (userId: string) => {
    onCreateDM(userId);
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    onCreateGroup(groupName.trim(), selectedUsers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'dm' | 'group')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm">
              <User className="h-4 w-4 mr-2" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              Groupe
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="pl-9"
            />
          </div>

          <TabsContent value="dm" className="mt-4">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleCreateDM(u.id)}
                      disabled={isCreating}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="font-medium">
                          {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilisateur'}
                        </p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="mt-4 space-y-4">
            <div>
              <Label htmlFor="group-name">Nom du groupe</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Équipe technique"
              />
            </div>

            <div>
              <Label>Membres ({selectedUsers.length})</Label>
              <ScrollArea className="h-[200px] mt-2 border rounded-lg">
                {isLoading ? (
                  <div className="p-2 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
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
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {`${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilisateur'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0 || isCreating}
              className="w-full"
            >
              {isCreating ? 'Création...' : 'Créer le groupe'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
