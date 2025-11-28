import { useState, useMemo } from 'react';
import { useUsersWithPermissions, useGroups, useScopes, useAllGroupPermissions, useUpsertUserPermission, useDeleteUserPermission, useUpdateUserGroup, useUpdateUserSystemRole } from '@/hooks/use-permissions-admin';
import { UserWithPermissions, Group, Scope, PERMISSION_LEVELS, SystemRole, SYSTEM_ROLE_LEVELS, calculateEffectivePermission } from '@/services/permissionsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, User, X, Ban, Shield, Users as UsersIcon, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPermissionHelpText, PermissionLevel } from '@/config/permissionsHelpTexts';

const SYSTEM_ROLES: { value: SystemRole; label: string; color: string }[] = [
  { value: 'visiteur', label: 'Visiteur', color: 'bg-gray-100 text-gray-800' },
  { value: 'utilisateur', label: 'Utilisateur', color: 'bg-blue-100 text-blue-800' },
  { value: 'support', label: 'Support', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
];

export default function PermissionsUsers() {
  const { data: users, isLoading: usersLoading } = useUsersWithPermissions();
  const { data: groups } = useGroups();
  const { data: scopes } = useScopes();
  const { data: allGroupPermissions } = useAllGroupPermissions(groups);
  
  const upsertUserPermission = useUpsertUserPermission();
  const deleteUserPermission = useDeleteUserPermission();
  const updateUserGroup = useUpdateUserGroup();
  const updateUserSystemRole = useUpdateUserSystemRole();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [showOverridesOnly, setShowOverridesOnly] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterSystemRole, setFilterSystemRole] = useState<string>('all');
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGroup = filterGroup === 'all' || user.group_id === filterGroup || (filterGroup === 'none' && !user.group_id);
      const matchesRole = filterSystemRole === 'all' || user.system_role === filterSystemRole;
      const matchesOverride = !showOverridesOnly || user.overrides.length > 0;
      
      return matchesSearch && matchesGroup && matchesRole && matchesOverride;
    });
  }, [users, searchQuery, filterGroup, filterSystemRole, showOverridesOnly]);
  
  const handleSetOverride = (scopeId: string, level: number | null, deny: boolean = false) => {
    if (selectedUser) {
      if (level === null && !deny) {
        deleteUserPermission.mutate({ userId: selectedUser.id, scopeId });
        // Update local state - remove override
        setSelectedUser({
          ...selectedUser,
          overrides: selectedUser.overrides.filter(o => o.scope_id !== scopeId)
        });
      } else {
        upsertUserPermission.mutate({ userId: selectedUser.id, scopeId, level, deny });
        // Update local state - add/update override
        const existingIndex = selectedUser.overrides.findIndex(o => o.scope_id === scopeId);
        const existingOverride = existingIndex >= 0 ? selectedUser.overrides[existingIndex] : null;
        const newOverride = { 
          id: existingOverride?.id || 'temp-' + scopeId, 
          user_id: selectedUser.id,
          scope_id: scopeId, 
          level: level ?? 0, 
          deny: deny 
        };
        const newOverrides = existingIndex >= 0
          ? selectedUser.overrides.map((o, i) => i === existingIndex ? newOverride : o)
          : [...selectedUser.overrides, newOverride];
        setSelectedUser({
          ...selectedUser,
          overrides: newOverrides
        });
      }
    }
  };
  
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'deny':
        return <Badge variant="destructive" className="text-xs"><Ban className="w-3 h-3 mr-1" />DENY</Badge>;
      case 'override':
        return <Badge className="text-xs bg-orange-500">Override</Badge>;
      case 'group':
        return <Badge variant="secondary" className="text-xs"><UsersIcon className="w-3 h-3 mr-1" />Groupe</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Défaut</Badge>;
    }
  };
  
  if (usersLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  
  return (
    <TooltipProvider delayDuration={300}>
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Permissions Utilisateurs</h1>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  <SelectItem value="none">Sans groupe</SelectItem>
                  {groups?.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSystemRole} onValueChange={setFilterSystemRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rôle système" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {SYSTEM_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch id="overrides" checked={showOverridesOnly} onCheckedChange={setShowOverridesOnly} />
                <Label htmlFor="overrides" className="text-sm">Avec overrides</Label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Users List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="w-full flex items-center justify-between py-3 px-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.group && (
                      <Badge variant="outline" className="text-xs">{user.group.label}</Badge>
                    )}
                    <Badge className={cn("text-xs", SYSTEM_ROLES.find(r => r.value === user.system_role)?.color)}>
                      {SYSTEM_ROLES.find(r => r.value === user.system_role)?.label || 'Utilisateur'}
                    </Badge>
                    {user.overrides.length > 0 && (
                      <Badge className="text-xs bg-orange-500">{user.overrides.length} override{user.overrides.length > 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* User Detail Sheet */}
        <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedUser && scopes && allGroupPermissions && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p>{selectedUser.first_name} {selectedUser.last_name}</p>
                      <p className="text-sm font-normal text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* User Config */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Rôle système (plafond)</Label>
                      <Select 
                        value={selectedUser.system_role || 'utilisateur'} 
                        onValueChange={(v: SystemRole) => {
                          updateUserSystemRole.mutate({ userId: selectedUser.id, systemRole: v });
                          setSelectedUser({ ...selectedUser, system_role: v });
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_ROLES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Groupe</Label>
                      <Select 
                        value={selectedUser.group_id || 'none'} 
                        onValueChange={(v) => {
                          const groupId = v === 'none' ? null : v;
                          updateUserGroup.mutate({ userId: selectedUser.id, groupId });
                          setSelectedUser({ 
                            ...selectedUser, 
                            group_id: groupId,
                            group: groups?.find(g => g.id === groupId) || null
                          });
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun groupe</SelectItem>
                          {groups?.map(g => (
                            <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Permissions Table */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Permissions par scope</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left py-2 px-3 font-medium">Scope</th>
                            <th className="text-center py-2 px-2 font-medium w-16">Groupe</th>
                            <th className="text-center py-2 px-2 font-medium w-20">Override</th>
                            <th className="text-center py-2 px-2 font-medium w-16">Plafond</th>
                            <th className="text-center py-2 px-2 font-medium w-16">Final</th>
                            <th className="text-center py-2 px-2 font-medium w-20">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {scopes.map(scope => {
                            const result = calculateEffectivePermission(selectedUser, scope, allGroupPermissions);
                            const override = selectedUser.overrides.find(o => o.scope_id === scope.id);
                            const groupPerms = selectedUser.group_id ? allGroupPermissions.get(selectedUser.group_id) : undefined;
                            const groupPerm = groupPerms?.find(gp => gp.scope_id === scope.id);
                            
                            return (
                              <tr key={scope.id} className="hover:bg-muted/30">
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium">{scope.label}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <p className="font-semibold text-xs mb-1">{scope.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {getPermissionHelpText(scope.slug, result.level as PermissionLevel)}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2">
                                  {groupPerm ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs cursor-help">
                                          {PERMISSION_LEVELS[groupPerm.level]?.label || groupPerm.level}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">
                                          {getPermissionHelpText(scope.slug, groupPerm.level as PermissionLevel)}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : '-'}
                                </td>
                                <td className="text-center py-2 px-2">
                                  <Select
                                    value={override?.deny ? 'deny' : (override?.level?.toString() || 'none')}
                                    onValueChange={(v) => {
                                      if (v === 'none') {
                                        handleSetOverride(scope.id, null);
                                      } else if (v === 'deny') {
                                        handleSetOverride(scope.id, 0, true);
                                      } else {
                                        handleSetOverride(scope.id, parseInt(v));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-</SelectItem>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <SelectItem value="deny" className="text-destructive">DENY</SelectItem>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          <p className="text-xs">Bloque complètement l'accès, ignore les autres permissions</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      {PERMISSION_LEVELS.map(l => (
                                        <SelectItem key={l.value} value={l.value.toString()}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span>{l.label}</span>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-xs">
                                              <p className="text-xs">
                                                {getPermissionHelpText(scope.slug, l.value as PermissionLevel)}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="text-center py-2 px-2">
                                  <Badge variant="outline" className="text-xs">
                                    {PERMISSION_LEVELS[result.ceiling]?.label || result.ceiling}
                                  </Badge>
                                </td>
                                <td className="text-center py-2 px-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className={cn("text-xs cursor-help", PERMISSION_LEVELS[result.level]?.color)}>
                                        {PERMISSION_LEVELS[result.level]?.label || result.level}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-semibold text-xs mb-1">Permission effective</p>
                                      <p className="text-xs text-muted-foreground">
                                        {getPermissionHelpText(scope.slug, result.level as PermissionLevel)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="text-center py-2 px-2">
                                  {getSourceBadge(result.source)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
