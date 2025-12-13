/**
 * Onglet Utilisateurs - Gestion des accès par utilisateur
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Settings2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GLOBAL_ROLE_LABELS } from '@/types/globalRoles';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllAgencySubscriptions } from '@/hooks/access-rights/useAgencySubscription';

interface UserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  global_role: string | null;
  agency_id: string | null;
  is_active: boolean;
  agency?: {
    label: string;
    slug: string;
  } | null;
}

export function UsersAccessTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['access-rights-users'],
    queryFn: async (): Promise<UserRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, first_name, last_name, global_role, agency_id, is_active,
          agency:apogee_agencies(label, slug)
        `)
        .order('last_name');
      
      if (error) throw error;
      return data as UserRow[];
    },
  });
  
  const { data: subscriptions } = useAllAgencySubscriptions();
  
  // Créer une map agencyId -> plan
  const agencyPlanMap = new Map<string, string>();
  subscriptions?.forEach(sub => {
    agencyPlanMap.set(sub.agency_id, sub.tier_key);
  });
  
  const filteredUsers = users?.filter(user => {
    const matchesSearch = !search || 
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.global_role === roleFilter;
    
    return matchesSearch && matchesRole;
  }) || [];

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'superadmin': return 'bg-red-500';
      case 'platform_admin': return 'bg-orange-500';
      case 'franchisor_admin': return 'bg-purple-500';
      case 'franchisor_user': return 'bg-blue-500';
      case 'franchisee_admin': return 'bg-green-500';
      case 'franchisee_user': return 'bg-teal-500';
      default: return 'bg-muted';
    }
  };
  
  const getPlanBadgeColor = (plan: string | undefined) => {
    switch (plan) {
      case 'PRO': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'STARTER': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'FREE': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted/50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Utilisateurs et Accès
        </CardTitle>
        <CardDescription>
          Visualisez et gérez les accès utilisateurs selon leur rôle et le plan de leur agence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {Object.entries(GLOBAL_ROLE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle Global</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Plan Agence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const agencyPlan = user.agency_id ? agencyPlanMap.get(user.agency_id) : undefined;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.global_role)} text-white`}>
                          {GLOBAL_ROLE_LABELS[user.global_role as keyof typeof GLOBAL_ROLE_LABELS] || user.global_role || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.agency?.label || (
                          <span className="text-muted-foreground italic">Sans agence</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {agencyPlan ? (
                          <Badge className={getPlanBadgeColor(agencyPlan)}>
                            {agencyPlan}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} utilisateur(s) affiché(s)
        </div>
      </CardContent>
    </Card>
  );
}
