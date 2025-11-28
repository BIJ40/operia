import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Search, AlertTriangle, CheckCircle, XCircle, MinusCircle, Info, Users, Wand2, CheckCheck } from 'lucide-react';
import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { EnabledModules, ModuleKey, MODULE_DEFINITIONS } from '@/types/modules';
import { getGlobalRoleFromLegacy, getEnabledModulesFromLegacy } from '@/types/accessControl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { logInfo } from '@/lib/logger';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface UserWithV2Data {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  system_role: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
  support_level: number | null;
  // Computed
  suggestedGlobalRole: GlobalRole;
  suggestedEnabledModules: EnabledModules;
  hasAdminRole: boolean;
  hasSupportRole: boolean;
  hasFranchiseurRole: boolean;
  franchiseurRole: string | null;
}

function CoherenceIndicator({ 
  dbValue, 
  suggestedValue, 
  type 
}: { 
  dbValue: unknown; 
  suggestedValue: unknown; 
  type: 'role' | 'modules';
}) {
  const isNull = dbValue === null || dbValue === undefined;
  const isEqual = type === 'role' 
    ? dbValue === suggestedValue 
    : JSON.stringify(dbValue) === JSON.stringify(suggestedValue);

  if (isNull) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <MinusCircle className="w-5 h-5 text-orange-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Non migré (utilise valeur suggérée)</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isEqual) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Cohérent avec le legacy</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <XCircle className="w-5 h-5 text-red-500" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Différent du legacy suggéré</p>
      </TooltipContent>
    </Tooltip>
  );
}

function RoleBadge({ role, isDb }: { role: GlobalRole | null; isDb: boolean }) {
  if (!role) return <span className="text-muted-foreground text-xs">—</span>;
  
  const level = GLOBAL_ROLES[role];
  const colors: Record<number, string> = {
    0: 'bg-gray-100 text-gray-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-cyan-100 text-cyan-700',
    3: 'bg-purple-100 text-purple-700',
    4: 'bg-violet-100 text-violet-700',
    5: 'bg-orange-100 text-orange-700',
    6: 'bg-red-100 text-red-700',
  };

  return (
    <Badge variant="outline" className={`${colors[level] || ''} ${isDb ? 'border-2' : 'border-dashed opacity-70'}`}>
      N{level} {role}
    </Badge>
  );
}

function ModulesSummary({ modules, isDb }: { modules: EnabledModules | null; isDb: boolean }) {
  if (!modules || Object.keys(modules).length === 0) {
    return <span className="text-muted-foreground text-xs">Aucun module</span>;
  }

  const enabledModules = Object.entries(modules)
    .filter(([_, config]) => config?.enabled)
    .map(([key]) => key as ModuleKey);

  if (enabledModules.length === 0) {
    return <span className="text-muted-foreground text-xs">Aucun module activé</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1 ${!isDb ? 'opacity-70' : ''}`}>
      {enabledModules.map(mod => (
        <Badge 
          key={mod} 
          variant="secondary" 
          className={`text-xs ${!isDb ? 'border-dashed' : ''}`}
        >
          {MODULE_DEFINITIONS[mod]?.label || mod}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminRolesV2() {
  const [search, setSearch] = useState('');
  const [filterAgence, setFilterAgence] = useState<string>('all');
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set(['all']));
  const queryClient = useQueryClient();

  // Mutation pour appliquer les suggestions V2
  const applyV2Mutation = useMutation({
    mutationFn: async ({ userId, globalRole, enabledModules }: { 
      userId: string; 
      globalRole: GlobalRole; 
      enabledModules: EnabledModules;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          global_role: globalRole,
          enabled_modules: enabledModules as Json,
        })
        .eq('id', userId);

      if (error) throw error;
      return { userId, globalRole, enabledModules };
    },
    onSuccess: ({ userId, globalRole, enabledModules }) => {
      logInfo('AUTH', `[V2] Migration préparée pour user ${userId}: global_role=${globalRole}, enabled_modules=${JSON.stringify(enabledModules)}`);
      toast.success('Suggestion V2 appliquée');
      queryClient.invalidateQueries({ queryKey: ['admin-roles-v2-users'] });
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'application V2');
      console.error('[V2] Erreur migration:', error);
    },
  });

  // Fetch all users with their roles
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-roles-v2-users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('agence', { ascending: true });
      
      if (profilesError) throw profilesError;

      // Fetch user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Fetch user_capabilities
      const { data: capabilities, error: capError } = await supabase
        .from('user_capabilities')
        .select('user_id, capability, is_active');
      
      if (capError) throw capError;

      // Fetch franchiseur_roles
      const { data: franchiseurRoles, error: frError } = await supabase
        .from('franchiseur_roles')
        .select('user_id, franchiseur_role');
      
      if (frError) throw frError;

      // Build lookup maps
      const rolesMap = new Map<string, string[]>();
      userRoles?.forEach(ur => {
        if (!rolesMap.has(ur.user_id)) rolesMap.set(ur.user_id, []);
        rolesMap.get(ur.user_id)!.push(ur.role);
      });

      const capabilitiesMap = new Map<string, string[]>();
      capabilities?.filter(c => c.is_active).forEach(c => {
        if (!capabilitiesMap.has(c.user_id)) capabilitiesMap.set(c.user_id, []);
        capabilitiesMap.get(c.user_id)!.push(c.capability);
      });

      const franchiseurRolesMap = new Map<string, string>();
      franchiseurRoles?.forEach(fr => {
        franchiseurRolesMap.set(fr.user_id, fr.franchiseur_role);
      });

      // Compute V2 data for each user
      const users: UserWithV2Data[] = (profiles || []).map(profile => {
        const roles = rolesMap.get(profile.id) || [];
        const caps = capabilitiesMap.get(profile.id) || [];
        const frRole = franchiseurRolesMap.get(profile.id) || null;

        const hasAdminRole = roles.includes('admin');
        const hasSupportRole = roles.includes('support') || caps.includes('support');
        const hasFranchiseurRole = roles.includes('franchiseur');

        const legacyData = {
          systemRole: profile.system_role,
          roleAgence: profile.role_agence,
          hasAdminRole,
          hasSupportRole,
          hasFranchiseurRole,
          franchiseurRole: frRole,
          supportLevel: profile.support_level,
        };

        const suggestedGlobalRole = getGlobalRoleFromLegacy(legacyData);
        const suggestedEnabledModules = getEnabledModulesFromLegacy({
          globalRole: suggestedGlobalRole,
          ...legacyData,
        });

        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          agence: profile.agence,
          role_agence: profile.role_agence,
          system_role: profile.system_role,
          global_role: profile.global_role as GlobalRole | null,
          enabled_modules: profile.enabled_modules as EnabledModules | null,
          support_level: profile.support_level,
          suggestedGlobalRole,
          suggestedEnabledModules,
          hasAdminRole,
          hasSupportRole,
          hasFranchiseurRole,
          franchiseurRole: frRole,
        };
      });

      return users;
    },
  });

  // Get unique agencies for filter
  const agencies = useMemo(() => {
    if (!usersData) return [];
    const agencySet = new Set(usersData.map(u => u.agence || 'Sans agence'));
    return Array.from(agencySet).sort();
  }, [usersData]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    
    return usersData.filter(user => {
      // Agency filter
      if (filterAgence !== 'all') {
        const userAgence = user.agence || 'Sans agence';
        if (userAgence !== filterAgence) return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchEmail = user.email?.toLowerCase().includes(searchLower);
        const matchName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchLower);
        const matchAgence = user.agence?.toLowerCase().includes(searchLower);
        if (!matchEmail && !matchName && !matchAgence) return false;
      }

      return true;
    });
  }, [usersData, filterAgence, search]);

  // Group users by agency
  const groupedUsers = useMemo(() => {
    const groups = new Map<string, UserWithV2Data[]>();
    filteredUsers.forEach(user => {
      const agence = user.agence || 'Sans agence';
      if (!groups.has(agence)) groups.set(agence, []);
      groups.get(agence)!.push(user);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredUsers]);

  // Statistics for alerts
  const stats = useMemo(() => {
    if (!usersData) return { total: 0, notMigrated: 0, incoherent: 0, noModules: 0 };
    
    let notMigrated = 0;
    let incoherent = 0;
    let noModules = 0;

    usersData.forEach(user => {
      if (!user.global_role) notMigrated++;
      else if (user.global_role !== user.suggestedGlobalRole) incoherent++;
      
      if (!user.enabled_modules || Object.keys(user.enabled_modules).length === 0) {
        noModules++;
      }
    });

    return { total: usersData.length, notMigrated, incoherent, noModules };
  }, [usersData]);

  const toggleAgency = (agence: string) => {
    setExpandedAgencies(prev => {
      const next = new Set(prev);
      if (next.has(agence)) next.delete(agence);
      else next.add(agence);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>Impossible de charger les données utilisateurs.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Rôles V2.0</h1>
          <p className="text-muted-foreground">
            Visualisation en lecture seule des données V2 (global_role + enabled_modules)
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {stats.total} utilisateurs
        </Badge>
      </div>

      {/* Alertes statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Alert className={stats.notMigrated > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}>
          <MinusCircle className={`h-4 w-4 ${stats.notMigrated > 0 ? 'text-orange-500' : 'text-green-500'}`} />
          <AlertTitle>Non migrés</AlertTitle>
          <AlertDescription>
            {stats.notMigrated} utilisateur{stats.notMigrated > 1 ? 's' : ''} sans global_role (utilisent valeur suggérée)
          </AlertDescription>
        </Alert>

        <Alert className={stats.incoherent > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
          <XCircle className={`h-4 w-4 ${stats.incoherent > 0 ? 'text-red-500' : 'text-green-500'}`} />
          <AlertTitle>Incohérents</AlertTitle>
          <AlertDescription>
            {stats.incoherent} utilisateur{stats.incoherent > 1 ? 's' : ''} avec global_role différent du suggéré
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-300 bg-blue-50">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle>Sans modules DB</AlertTitle>
          <AlertDescription>
            {stats.noModules} utilisateur{stats.noModules > 1 ? 's' : ''} sans enabled_modules en DB
          </AlertDescription>
        </Alert>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou agence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAgence} onValueChange={setFilterAgence}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filtrer par agence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {agencies.map(agency => (
                  <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau par agence */}
      <div className="space-y-4">
        {groupedUsers.map(([agence, users]) => (
          <Card key={agence}>
            <Collapsible 
              open={expandedAgencies.has(agence)} 
              onOpenChange={() => toggleAgency(agence)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {agence}
                      <Badge variant="secondary">{users.length}</Badge>
                    </CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${expandedAgencies.has(agence) ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Utilisateur</TableHead>
                        <TableHead>Legacy</TableHead>
                        <TableHead>Global Role (DB)</TableHead>
                        <TableHead>Suggéré</TableHead>
                        <TableHead className="w-[60px] text-center">Cohér.</TableHead>
                        <TableHead>Modules (DB)</TableHead>
                        <TableHead>Modules Suggérés</TableHead>
                            <TableHead className="w-[60px] text-center">Cohér.</TableHead>
                            <TableHead className="w-[140px] text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map(user => {
                            const isRoleCoherent = user.global_role === user.suggestedGlobalRole;
                            const isModulesCoherent = JSON.stringify(user.enabled_modules) === JSON.stringify(user.suggestedEnabledModules);
                            const isFullyMigrated = user.global_role && user.enabled_modules && isRoleCoherent && isModulesCoherent;
                            
                            return (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {user.first_name} {user.last_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.email}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1 text-xs">
                                    <span>sys: {user.system_role || '—'}</span>
                                    <span>rôle: {user.role_agence || '—'}</span>
                                    {user.hasAdminRole && <Badge variant="destructive" className="text-xs w-fit">admin</Badge>}
                                    {user.hasSupportRole && <Badge variant="secondary" className="text-xs w-fit">support</Badge>}
                                    {user.hasFranchiseurRole && <Badge className="text-xs w-fit">{user.franchiseurRole || 'fr'}</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <RoleBadge role={user.global_role} isDb={true} />
                                </TableCell>
                                <TableCell>
                                  <RoleBadge role={user.suggestedGlobalRole} isDb={false} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <CoherenceIndicator 
                                    dbValue={user.global_role} 
                                    suggestedValue={user.suggestedGlobalRole}
                                    type="role"
                                  />
                                </TableCell>
                                <TableCell>
                                  <ModulesSummary modules={user.enabled_modules} isDb={true} />
                                </TableCell>
                                <TableCell>
                                  <ModulesSummary modules={user.suggestedEnabledModules} isDb={false} />
                                </TableCell>
                                <TableCell className="text-center">
                                  <CoherenceIndicator 
                                    dbValue={user.enabled_modules} 
                                    suggestedValue={user.suggestedEnabledModules}
                                    type="modules"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {isFullyMigrated ? (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                          <CheckCheck className="w-3 h-3 mr-1" />
                                          V2 OK
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Migration V2 appliquée et cohérente</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs"
                                      disabled={applyV2Mutation.isPending}
                                      onClick={() => applyV2Mutation.mutate({
                                        userId: user.id,
                                        globalRole: user.suggestedGlobalRole,
                                        enabledModules: user.suggestedEnabledModules,
                                      })}
                                    >
                                      {applyV2Mutation.isPending ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <Wand2 className="w-3 h-3 mr-1" />
                                      )}
                                      Appliquer V2
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun utilisateur trouvé avec ces critères.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
