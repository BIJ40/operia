/**
 * Onglet 3 - Gestion Utilisateurs
 * Liste des utilisateurs avec détection d'anomalies et actions rapides
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Search, Filter, CheckCircle, XCircle, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '@/types/globalRoles';
import { validateUserPermissions, ROLE_HIERARCHY, PermissionIssue } from '@/permissions';
import { toast } from 'sonner';

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

      // Valider les permissions de chaque utilisateur
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

function UserCard({ user }: { user: UserWithIssues }) {
  const hasErrors = user.issues.some(i => i.type === 'error');
  const hasWarnings = user.issues.some(i => i.type === 'warning') && !hasErrors;
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || '?';

  const handleApplyTemplate = async () => {
    toast.info('Fonctionnalité en cours de développement');
  };

  return (
    <Card className={`
      border-l-4
      ${hasErrors ? 'border-l-destructive' : ''}
      ${hasWarnings ? 'border-l-yellow-500' : ''}
      ${!hasErrors && !hasWarnings ? 'border-l-green-500' : ''}
    `}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info utilisateur */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user.global_role && (
              <Badge variant="outline" className="font-mono">
                N{ROLE_HIERARCHY[user.global_role]} - {GLOBAL_ROLE_LABELS[user.global_role]}
              </Badge>
            )}
            {user.agency_label && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {user.agency_label}
              </Badge>
            )}
            {!user.is_active && (
              <Badge variant="destructive">Inactif</Badge>
            )}
          </div>
        </div>

        {/* Issues */}
        {user.issues.length > 0 && (
          <div className="mt-3 space-y-2">
            {user.issues.map((issue, idx) => (
              <div 
                key={idx}
                className={`
                  flex items-center justify-between p-2 rounded text-sm
                  ${issue.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'}
                `}
              >
                <div className="flex items-center gap-2">
                  {issue.type === 'error' ? (
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{issue.message}</span>
                </div>
                {issue.fix && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs"
                    onClick={handleApplyTemplate}
                  >
                    {issue.fix}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Status OK */}
        {user.issues.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            Configuration valide
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function UserManagementTab() {
  const { data: users, isLoading, refetch } = useUsersWithPermissions();
  const [search, setSearch] = useState('');
  const [filterIssues, setFilterIssues] = useState<'all' | 'errors' | 'warnings' | 'ok'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

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
      // Recherche
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          user.email.toLowerCase().includes(searchLower) ||
          (user.first_name?.toLowerCase().includes(searchLower)) ||
          (user.last_name?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Filtre issues
      if (filterIssues === 'errors' && !user.issues.some(i => i.type === 'error')) return false;
      if (filterIssues === 'warnings' && (!user.issues.some(i => i.type === 'warning') || user.issues.some(i => i.type === 'error'))) return false;
      if (filterIssues === 'ok' && user.issues.length > 0) return false;

      // Filtre rôle
      if (filterRole !== 'all' && user.global_role !== filterRole) return false;

      return true;
    });
  }, [users, search, filterIssues, filterRole]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertes globales */}
      {stats.errors > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.errors}</strong> utilisateur(s) avec des erreurs critiques de permissions
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilterIssues('all')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-destructive/50" onClick={() => setFilterIssues('errors')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
            <div className="text-sm text-muted-foreground">Erreurs</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-yellow-500/50" onClick={() => setFilterIssues('warnings')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 border-green-500/50" onClick={() => setFilterIssues('ok')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
            <div className="text-sm text-muted-foreground">OK</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {Object.entries(GLOBAL_ROLE_LABELS).map(([role, label]) => (
              <SelectItem key={role} value={role}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filteredUsers.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucun utilisateur ne correspond aux filtres
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
