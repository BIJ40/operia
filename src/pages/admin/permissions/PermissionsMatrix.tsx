import { useState, useMemo } from 'react';
import { useUsersWithPermissions, useGroups, useScopes, useAllGroupPermissions } from '@/hooks/use-permissions-admin';
import { PERMISSION_LEVELS, SystemRole, calculateEffectivePermission } from '@/services/permissionsService';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const SYSTEM_ROLES: { value: SystemRole; label: string }[] = [
  { value: 'visiteur', label: 'Visiteur' },
  { value: 'utilisateur', label: 'Utilisateur' },
  { value: 'support', label: 'Support' },
  { value: 'admin', label: 'Admin' },
];

export default function PermissionsMatrix() {
  const { data: users, isLoading: usersLoading } = useUsersWithPermissions();
  const { data: groups } = useGroups();
  const { data: scopes } = useScopes();
  const { data: allGroupPermissions } = useAllGroupPermissions(groups);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterSystemRole, setFilterSystemRole] = useState<string>('all');
  const [filterAgence, setFilterAgence] = useState<string>('all');
  const [showOverridesOnly, setShowOverridesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'users' | 'groups'>('users');
  
  const uniqueAgences = useMemo(() => {
    if (!users) return [];
    const agences = new Set(users.map(u => u.agence).filter(Boolean));
    return Array.from(agences).sort();
  }, [users]);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGroup = filterGroup === 'all' || user.group_id === filterGroup || (filterGroup === 'none' && !user.group_id);
      const matchesRole = filterSystemRole === 'all' || user.system_role === filterSystemRole;
      const matchesAgence = filterAgence === 'all' || user.agence === filterAgence;
      const matchesOverride = !showOverridesOnly || user.overrides.length > 0;
      
      return matchesSearch && matchesGroup && matchesRole && matchesAgence && matchesOverride;
    });
  }, [users, searchQuery, filterGroup, filterSystemRole, filterAgence, showOverridesOnly]);
  
  if (usersLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Matrice Globale des Permissions</h1>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous groupes</SelectItem>
                <SelectItem value="none">Sans groupe</SelectItem>
                {groups?.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSystemRole} onValueChange={setFilterSystemRole}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous rôles</SelectItem>
                {SYSTEM_ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAgence} onValueChange={setFilterAgence}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Agence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes agences</SelectItem>
                {uniqueAgences.map(a => (
                  <SelectItem key={a} value={a!}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch id="overrides-matrix" checked={showOverridesOnly} onCheckedChange={setShowOverridesOnly} />
              <Label htmlFor="overrides-matrix" className="text-sm">Overrides</Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v: 'users' | 'groups') => setViewMode(v)}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <User className="w-4 h-4" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <UsersIcon className="w-4 h-4" /> Groupes
          </TabsTrigger>
        </TabsList>
        
        {/* Users Matrix */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} × {scopes?.length || 0} scopes
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium min-w-[180px]">Utilisateur</th>
                    <th className="text-left py-2 px-2 font-medium w-24">Groupe</th>
                    <th className="text-center py-2 px-2 font-medium w-20">Rôle</th>
                    {scopes?.map(scope => (
                      <th key={scope.id} className="text-center py-2 px-1 font-medium min-w-[60px]" title={scope.description || ''}>
                        <span className="inline-block max-w-[60px] truncate">{scope.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div>
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                          {user.agence && <span className="text-muted-foreground ml-1">({user.agence})</span>}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {user.group?.label || '-'}
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {SYSTEM_ROLES.find(r => r.value === user.system_role)?.label || 'Utilisateur'}
                        </Badge>
                      </td>
                      {scopes?.map(scope => {
                        if (!allGroupPermissions) return <td key={scope.id}>-</td>;
                        const result = calculateEffectivePermission(user, scope, allGroupPermissions);
                        const hasOverride = user.overrides.some(o => o.scope_id === scope.id);
                        
                        return (
                          <td key={scope.id} className="text-center py-2 px-1">
                            <Badge 
                              className={cn(
                                "text-xs",
                                PERMISSION_LEVELS[result.level]?.color,
                                hasOverride && "ring-2 ring-orange-400"
                              )}
                              title={`Source: ${result.source}`}
                            >
                              {result.level}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Groups Matrix */}
        <TabsContent value="groups">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {groups?.length || 0} groupe{(groups?.length || 0) > 1 ? 's' : ''} × {scopes?.length || 0} scopes
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium min-w-[150px]">Groupe</th>
                    <th className="text-left py-2 px-2 font-medium w-20">Type</th>
                    <th className="text-center py-2 px-2 font-medium w-20">Plafond</th>
                    {scopes?.map(scope => (
                      <th key={scope.id} className="text-center py-2 px-1 font-medium min-w-[60px]" title={scope.description || ''}>
                        <span className="inline-block max-w-[60px] truncate">{scope.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groups?.map(group => {
                    const groupPerms = allGroupPermissions?.get(group.id) || [];
                    
                    return (
                      <tr key={group.id} className="hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{group.label}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-xs">
                            {group.type === 'franchise' ? 'Franchise' : 'Franchiseur'}
                          </Badge>
                        </td>
                        <td className="text-center py-2 px-2">
                          <Badge variant="secondary" className="text-xs">
                            {SYSTEM_ROLES.find(r => r.value === group.system_role_limit)?.label}
                          </Badge>
                        </td>
                        {scopes?.map(scope => {
                          const perm = groupPerms.find(p => p.scope_id === scope.id);
                          const level = perm?.level ?? 0;
                          
                          return (
                            <td key={scope.id} className="text-center py-2 px-1">
                              <Badge className={cn("text-xs", PERMISSION_LEVELS[level]?.color)}>
                                {level}
                              </Badge>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Légende:</span>
            {PERMISSION_LEVELS.map(level => (
              <Badge key={level.value} className={cn("text-xs", level.color)}>
                {level.value} = {level.label}
              </Badge>
            ))}
            <Badge className="text-xs ring-2 ring-orange-400">Override</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
