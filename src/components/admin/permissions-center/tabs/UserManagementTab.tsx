/**
 * Onglet 3 - Gestion Utilisateurs
 * Liste des utilisateurs avec détection d'anomalies et actions de gestion
 * P2: Filtres avancés (agence), Export CSV
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  AlertTriangle, Search, Filter, CheckCircle, XCircle, AlertCircle, 
  RefreshCw, Building2, Pencil, Layers
} from 'lucide-react';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { validateUserPermissions, ROLE_HIERARCHY, PermissionIssue } from '@/permissions';
import { UserEditDialog } from '../components/UserEditDialog';
import { UserExportCSV } from '../components/UserExportCSV';

interface UserWithIssues {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  global_role: GlobalRole | null;
  agency_id: string | null;
  agency_label: string | null;
  enabled_modules: Record<string, any> | null;
  support_level: number | null;
  is_active: boolean;
  issues: PermissionIssue[];
}

function useUsersWithPermissions() {
  return useQuery({
    queryKey: ['permissions-center-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, avatar_url,
          global_role, agency_id, enabled_modules, support_level, is_active,
          apogee_agencies(label)
        `)
        .order('global_role', { ascending: false });

      if (error) throw error;

      const usersWithIssues: UserWithIssues[] = (data || []).map(user => {
        const issues = validateUserPermissions({
          globalRole: user.global_role as GlobalRole | null,
          enabledModules: user.enabled_modules as Record<string, any> | null,
          agencyId: user.agency_id,
          supportLevel: user.support_level,
        });

        return {
          id: user.id,
          email: user.email || '',
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          global_role: user.global_role as GlobalRole | null,
          agency_id: user.agency_id,
          agency_label: (user.apogee_agencies as any)?.label || null,
          enabled_modules: user.enabled_modules as Record<string, any> | null,
          support_level: user.support_level,
          is_active: user.is_active ?? true,
          issues,
        };
      });

      return usersWithIssues;
    },
  });
}

// Compte les modules actifs
function countActiveModules(modules: Record<string, any> | null): number {
  if (!modules) return 0;
  return Object.values(modules).filter(m => 
    (typeof m === 'boolean' && m) || (typeof m === 'object' && m?.enabled)
  ).length;
}

function UserRow({ 
  user, 
  onEdit 
}: { 
  user: UserWithIssues; 
  onEdit: () => void;
}) {
  const hasErrors = user.issues.some(i => i.type === 'error');
  const hasWarnings = user.issues.some(i => i.type === 'warning') && !hasErrors;
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '?';
  const moduleCount = countActiveModules(user.enabled_modules);

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50
      ${hasErrors ? 'border-l-4 border-l-destructive' : ''}
      ${hasWarnings ? 'border-l-4 border-l-yellow-500' : ''}
      ${!hasErrors && !hasWarnings ? 'border-l-4 border-l-green-500' : ''}
    `}>
      {/* Avatar */}
      <Avatar className="h-9 w-9">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      
      {/* Info principale */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {user.first_name} {user.last_name}
          </span>
          {!user.is_active && (
            <Badge variant="destructive" className="text-xs">Inactif</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
      </div>
      
      {/* Badges compacts */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {user.global_role && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="font-mono text-xs">
                  N{ROLE_HIERARCHY[user.global_role]}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{GLOBAL_ROLE_LABELS[user.global_role]}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {user.agency_label && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs max-w-[100px] truncate">
                  <Building2 className="h-3 w-3 mr-1" />
                  {user.agency_label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{user.agency_label}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                {moduleCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{moduleCount} modules activés</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Status */}
        {hasErrors && (
          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        )}
        {hasWarnings && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
        {!hasErrors && !hasWarnings && (
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
        )}
      </div>
      
      {/* Action */}
      <Button size="sm" variant="ghost" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function UserManagementTab() {
  const { data: users, isLoading, refetch } = useUsersWithPermissions();
  const [search, setSearch] = useState('');
  const [filterIssues, setFilterIssues] = useState<'all' | 'errors' | 'warnings' | 'ok'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserWithIssues | null>(null);

  // Liste des agences uniques
  const agencies = useMemo(() => {
    if (!users) return [];
    const uniqueAgencies = new Map<string, string>();
    users.forEach(u => {
      if (u.agency_id && u.agency_label) {
        uniqueAgencies.set(u.agency_id, u.agency_label);
      }
    });
    return Array.from(uniqueAgencies.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  // Statistiques
  const stats = useMemo(() => {
    if (!users) return { total: 0, errors: 0, warnings: 0, ok: 0 };
    return {
      total: users.length,
      errors: users.filter(u => u.issues.some(i => i.type === 'error')).length,
      warnings: users.filter(u => u.issues.some(i => i.type === 'warning') && !u.issues.some(i => i.type === 'error')).length,
      ok: users.filter(u => u.issues.length === 0).length,
    };
  }, [users]);

  // Filtrage
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          user.email.toLowerCase().includes(searchLower) ||
          (user.first_name?.toLowerCase().includes(searchLower)) ||
          (user.last_name?.toLowerCase().includes(searchLower)) ||
          (user.agency_label?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      if (filterIssues === 'errors' && !user.issues.some(i => i.type === 'error')) return false;
      if (filterIssues === 'warnings' && (!user.issues.some(i => i.type === 'warning') || user.issues.some(i => i.type === 'error'))) return false;
      if (filterIssues === 'ok' && user.issues.length > 0) return false;
      if (filterRole !== 'all' && user.global_role !== filterRole) return false;
      if (filterAgency === 'none' && user.agency_id !== null) return false;
      if (filterAgency !== 'all' && filterAgency !== 'none' && user.agency_id !== filterAgency) return false;
      return true;
    });
  }, [users, search, filterIssues, filterRole, filterAgency]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertes globales */}
      {stats.errors > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.errors}</strong> utilisateur(s) avec erreurs de permissions
          </AlertDescription>
        </Alert>
      )}

      {/* Stats compactes */}
      <div className="grid grid-cols-4 gap-2">
        <Card 
          className={`cursor-pointer transition-colors ${filterIssues === 'all' ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterIssues('all')}
        >
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors border-destructive/30 ${filterIssues === 'errors' ? 'ring-2 ring-destructive' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterIssues('errors')}
        >
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-destructive">{stats.errors}</div>
            <div className="text-xs text-muted-foreground">Erreurs</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors border-yellow-500/30 ${filterIssues === 'warnings' ? 'ring-2 ring-yellow-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterIssues('warnings')}
        >
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-xs text-muted-foreground">Warnings</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors border-green-500/30 ${filterIssues === 'ok' ? 'ring-2 ring-green-500' : 'hover:bg-muted/50'}`}
          onClick={() => setFilterIssues('ok')}
        >
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-600">{stats.ok}</div>
            <div className="text-xs text-muted-foreground">OK</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher (nom, email, agence)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {Object.entries(GLOBAL_ROLE_LABELS).map(([role, label]) => (
              <SelectItem key={role} value={role}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAgency} onValueChange={setFilterAgency}>
          <SelectTrigger className="w-[150px] h-9">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Agence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes agences</SelectItem>
            <SelectItem value="none">Sans agence</SelectItem>
            {agencies.map(([id, label]) => (
              <SelectItem key={id} value={id}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <UserExportCSV users={filteredUsers} />
      </div>

      {/* Liste compacte */}
      <div className="space-y-1">
        {filteredUsers.map(user => (
          <UserRow 
            key={user.id} 
            user={user} 
            onEdit={() => setEditingUser(user)}
          />
        ))}
        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucun utilisateur ne correspond aux filtres
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Dialog d'édition */}
      <UserEditDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      />
    </div>
  );
}
