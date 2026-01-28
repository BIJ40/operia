/**
 * Gestion des Permissions - Page centrale de gestion des accès
 * Gère les utilisateurs, leurs rôles et accès
 */

import { PageHeader } from '@/components/layout/PageHeader';
import { useAccessRightsUsers } from '@/hooks/access-rights';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users } from 'lucide-react';
import { useState, useMemo } from 'react';

// Mapping simplifié des labels de rôles
const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  platform_admin: 'Admin Plateforme',
  animator: 'Animateur',
  franchisee_admin: 'Admin Franchisé',
  franchisee_user: 'Utilisateur Franchisé',
  salaried: 'Salarié',
  external: 'Externe',
};

// Mapping simplifié des couleurs
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-red-500 text-white',
  platform_admin: 'bg-purple-500 text-white',
  animator: 'bg-blue-500 text-white',
  franchisee_admin: 'bg-green-500 text-white',
  franchisee_user: 'bg-teal-500 text-white',
  salaried: 'bg-gray-500 text-white',
  external: 'bg-gray-400 text-white',
};

export default function UnifiedManagementPage() {
  const { users, isLoading } = useAccessRightsUsers();
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(u => 
      u.email?.toLowerCase().includes(lower) ||
      u.first_name?.toLowerCase().includes(lower) ||
      u.last_name?.toLowerCase().includes(lower)
    );
  }, [users, search]);

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Gestion des Permissions"
        subtitle="Utilisateurs, rôles et accès"
        backTo="/admin"
        backLabel="Administration"
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Utilisateurs
          </CardTitle>
          <CardDescription>
            Liste des utilisateurs et leurs rôles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un utilisateur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Agence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[user.global_role] || 'bg-gray-400 text-white'}>
                          {ROLE_LABELS[user.global_role] || user.global_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.agency_id ? (
                          <span className="text-sm">{user.agency_id}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredUsers.length} utilisateur(s)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
