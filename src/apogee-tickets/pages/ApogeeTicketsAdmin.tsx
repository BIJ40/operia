import { useState } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Users, ArrowRight, History, Shield, Settings, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useTicketUserRoles,
  useTicketTransitions,
  useAssignTicketRole,
  useRemoveTicketRole,
  useAddTransition,
  useRemoveTransition,
  useTicketHistory,
  TICKET_ROLE_LABELS,
  TicketRole,
} from '../hooks/useTicketPermissions';
import {
  useTicketFieldPermissions,
  useUpdateTicketFieldPermissions,
  PERMISSION_LABELS,
  TicketFieldPermissions,
} from '../hooks/useTicketFieldPermissions';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

export default function ApogeeTicketsAdmin() {
  const { isAdmin } = usePermissions();
  
  if (!isAdmin) {
    return <Navigate to="/apogee-tickets" replace />;
  }
  
  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Administration Ticketing</h1>
          <p className="text-muted-foreground">Gestion des rôles, transitions et historique</p>
        </div>
      </div>
      
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Users className="h-4 w-4" />
            Rôles Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="transitions" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Transitions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles">
          <UserRolesTab />
        </TabsContent>
        
        <TabsContent value="transitions">
          <TransitionsTab />
        </TabsContent>
        
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ USER ROLES TAB ============
function UserRolesTab() {
  const { data: userRoles, isLoading } = useTicketUserRoles();
  const assignRole = useAssignTicketRole();
  const removeRole = useRemoveTicketRole();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<TicketRole | ''>('');
  
  // Get all users with ticketing module (via user_modules) or admins
  const { data: eligibleUsers, refetch } = useQuery({
    queryKey: ['eligible-ticket-users'],
    queryFn: async () => {
      const [profilesResult, userModulesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, first_name, last_name, global_role')
          .eq('is_active', true)
          .order('email'),
        supabase
          .from('user_modules')
          .select('user_id')
          .eq('module_key', 'ticketing')
      ]);
      
      if (profilesResult.error) throw profilesResult.error;
      
      const userModuleSet = new Set(
        userModulesResult.data?.map(um => um.user_id) || []
      );
      
      // Filter users with ticketing module via user_modules or admins (N5+)
      return (profilesResult.data || []).filter((u: any) => {
        const hasModuleViaUserModules = userModuleSet.has(u.id);
        const isAdmin = u.global_role === 'platform_admin' || u.global_role === 'superadmin';
        return hasModuleViaUserModules || isAdmin;
      });
    },
    staleTime: 0,
  });
  
  const handleAssign = () => {
    if (selectedUserId && selectedRole) {
      assignRole.mutate({ userId: selectedUserId, role: selectedRole });
      setSelectedUserId('');
      setSelectedRole('');
    }
  };
  
  const usersWithoutRole = eligibleUsers?.filter(
    u => !userRoles?.some(r => r.user_id === u.id)
  ) || [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rôles Utilisateurs</CardTitle>
        <CardDescription>
          Assignez un rôle à chaque utilisateur pour définir ses permissions de déplacement de tickets.
          Les admins (vous) ont tous les droits par défaut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new role */}
        <div className="flex gap-4 items-end p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Utilisateur</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {usersWithoutRole.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48 space-y-2">
            <label className="text-sm font-medium">Rôle</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as TicketRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {Object.entries(TICKET_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={!selectedUserId || !selectedRole}>
            <Plus className="h-4 w-4 mr-2" />
            Assigner
          </Button>
        </div>
        
        {/* Existing roles */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Assigné le</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : userRoles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucun rôle assigné
                </TableCell>
              </TableRow>
            ) : (
              userRoles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.user_name || '-'}</TableCell>
                  <TableCell>{role.user_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TICKET_ROLE_LABELS[role.ticket_role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(role.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRole.mutate(role.user_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============ TRANSITIONS TAB ============
function TransitionsTab() {
  const { data: transitions, isLoading } = useTicketTransitions();
  const { statuses } = useApogeeTickets();
  const addTransition = useAddTransition();
  const removeTransition = useRemoveTransition();
  
  const [fromStatus, setFromStatus] = useState<string>('');
  const [toStatus, setToStatus] = useState<string>('');
  const [role, setRole] = useState<TicketRole | ''>('');
  
  const handleAdd = () => {
    if (fromStatus && toStatus && role) {
      addTransition.mutate({
        from_status: fromStatus,
        to_status: toStatus,
        allowed_role: role,
      });
      setFromStatus('');
      setToStatus('');
      setRole('');
    }
  };
  
  const getStatusLabel = (id: string) => {
    return statuses?.find(s => s.id === id)?.label || id;
  };
  
  // Group transitions by role
  const transitionsByRole = (transitions || []).reduce((acc, t) => {
    if (!acc[t.allowed_role]) acc[t.allowed_role] = [];
    acc[t.allowed_role].push(t);
    return acc;
  }, {} as Record<TicketRole, typeof transitions>);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transitions Autorisées</CardTitle>
        <CardDescription>
          Définissez quels rôles peuvent déplacer les tickets entre quels statuts.
          Les admins peuvent tout faire par défaut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new transition */}
        <div className="flex gap-4 items-end p-4 bg-muted/50 rounded-lg flex-wrap">
          <div className="space-y-2">
            <label className="text-sm font-medium">De</label>
          <Select value={fromStatus} onValueChange={setFromStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut source" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {statuses?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground mb-2" />
          <div className="space-y-2">
            <label className="text-sm font-medium">Vers</label>
          <Select value={toStatus} onValueChange={setToStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut cible" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {statuses?.filter(s => s.id !== fromStatus).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rôle autorisé</label>
          <Select value={role} onValueChange={(v) => setRole(v as TicketRole)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {Object.entries(TICKET_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={!fromStatus || !toStatus || !role}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
        
        {/* Transitions by role */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : Object.keys(transitionsByRole).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune transition configurée. Les utilisateurs non-admin ne pourront pas déplacer de tickets.
          </p>
        ) : (
          <div className="space-y-6">
            {(Object.entries(transitionsByRole) as [TicketRole, typeof transitions][]).map(([roleKey, roleTransitions]) => (
              <div key={roleKey} className="space-y-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Badge>{TICKET_ROLE_LABELS[roleKey]}</Badge>
                  <span className="text-muted-foreground text-sm">
                    ({roleTransitions?.length || 0} transition{(roleTransitions?.length || 0) > 1 ? 's' : ''})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {roleTransitions?.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm group"
                    >
                      <span className="font-medium">{getStatusLabel(t.from_status)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getStatusLabel(t.to_status)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeTransition.mutate(t.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab() {
  const { data: permissions, isLoading } = useTicketFieldPermissions();
  const updatePermissions = useUpdateTicketFieldPermissions();
  
  const permissionKeys = Object.keys(PERMISSION_LABELS) as (keyof typeof PERMISSION_LABELS)[];
  const roles: TicketRole[] = ['developer', 'tester', 'franchiseur'];
  
  const handleToggle = (field: keyof typeof PERMISSION_LABELS, role: TicketRole, checked: boolean) => {
    if (!permissions) return;
    
    const currentRoles = permissions[field] as TicketRole[];
    const newRoles = checked
      ? [...currentRoles, role]
      : currentRoles.filter(r => r !== role);
    
    updatePermissions.mutate({ [field]: newRoles });
  };
  
  const isRoleEnabled = (field: keyof typeof PERMISSION_LABELS, role: TicketRole): boolean => {
    if (!permissions) return false;
    const allowedRoles = permissions[field] as TicketRole[];
    return allowedRoles.includes(role);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des paramètres...
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Paramètres des Permissions
        </CardTitle>
        <CardDescription>
          Définissez quels rôles peuvent effectuer quelles actions sur les tickets.
          Les admins ont tous les droits par défaut.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Action</TableHead>
              {roles.map(role => (
                <TableHead key={role} className="text-center w-[120px]">
                  <Badge variant="outline">{TICKET_ROLE_LABELS[role]}</Badge>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionKeys.map(field => (
              <TableRow key={field}>
                <TableCell className="font-medium">
                  {PERMISSION_LABELS[field]}
                </TableCell>
                {roles.map(role => (
                  <TableCell key={role} className="text-center">
                    <Checkbox
                      checked={isRoleEnabled(field, role)}
                      onCheckedChange={(checked) => handleToggle(field, role, checked === true)}
                      disabled={updatePermissions.isPending}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Les administrateurs (N5+) ont automatiquement tous les droits, 
            indépendamment de ces paramètres.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ HISTORY TAB ============
function HistoryTab() {
  const { data: history, isLoading } = useTicketHistory('');
  const { statuses, tickets } = useApogeeTickets();
  
  const getStatusLabel = (id: string) => {
    return statuses?.find(s => s.id === id)?.label || id;
  };
  
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'status_change': return 'Changement de statut';
      case 'comment_added': return 'Commentaire ajouté';
      case 'created': return 'Ticket créé';
      default: return action;
    }
  };

  const getTicketRef = (ticketId: string) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    const num = ticket?.ticket_number || 0;
    return `APO-${String(num).padStart(3, '0')}`;
  };

  const getTicketTitle = (ticketId: string) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    return ticket?.element_concerne || '';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Actions</CardTitle>
        <CardDescription>
          Traçabilité complète de toutes les actions effectuées sur les tickets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : history?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucun historique
                </TableCell>
              </TableRow>
            ) : (
              history?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-mono text-xs font-semibold text-primary">
                        {getTicketRef(entry.ticket_id)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={getTicketTitle(entry.ticket_id)}>
                        {getTicketTitle(entry.ticket_id)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.user_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{entry.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getActionLabel(entry.action_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.action_type === 'status_change' && entry.old_value && entry.new_value && (
                      <span>
                        {getStatusLabel(entry.old_value)} → {getStatusLabel(entry.new_value)}
                      </span>
                    )}
                    {entry.action_type === 'comment_added' && (
                      <span className="text-muted-foreground">Nouveau commentaire</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
