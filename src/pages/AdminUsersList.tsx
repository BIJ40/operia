import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Users, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditUserDialog } from '@/components/EditUserDialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, UserX } from 'lucide-react';
import { ColumnFilter } from '@/components/admin/user/ColumnFilter';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  service_competencies: any;
  created_at: string;
  system_roles?: string[];
  must_change_password: boolean | null;
  support_level?: number;
}

type SortColumn = 'email' | 'first_name' | 'last_name' | 'agence' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

const getRoleLabel = (roleValue: string | null): string => {
  if (!roleValue) return '-';
  const roles: Record<string, string> = {
    'dirigeant': 'Dirigeant(e)',
    'assistante': 'Assistante',
    'commercial': 'Commercial',
    'tete_de_reseau': 'Tête de réseau',
    'externe': 'Externe',
  };
  return roles[roleValue] || roleValue;
};

// Options de filtres
const ROLE_AGENCE_OPTIONS = [
  { value: 'dirigeant', label: 'Dirigeant(e)' },
  { value: 'assistante', label: 'Assistante' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'tete_de_reseau', label: 'Tête de réseau' },
  { value: 'externe', label: 'Externe' },
  { value: 'null', label: '(Non défini)' },
];

const SYSTEM_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'support', label: 'Support' },
  { value: 'franchiseur', label: 'Franchiseur' },
  { value: 'user', label: 'Utilisateur' },
];

const COMPETENCE_OPTIONS = [
  { value: 'apogee', label: 'Apogée' },
  { value: 'apporteurs', label: 'Apporteurs' },
  { value: 'conseil', label: 'Conseil' },
  { value: 'helpconfort_animateur_reseau', label: 'HC - Animateur' },
  { value: 'helpconfort_directeur_reseau', label: 'HC - Directeur' },
  { value: 'helpconfort_dg', label: 'HC - DG' },
];

export default function AdminUsersList() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // États des filtres
  const [roleAgenceFilters, setRoleAgenceFilters] = useState<string[]>([]);
  const [systemRoleFilters, setSystemRoleFilters] = useState<string[]>([]);
  const [competenceFilters, setCompetenceFilters] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          const roles = rolesData?.map(r => r.role) || [];
          
          return {
            ...profile,
            system_roles: roles.length > 0 ? roles : ['user']
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: 'Utilisateur supprimé',
        description: 'L\'utilisateur a été supprimé avec succès',
      });

      loadUsers();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive',
      });
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedUsers = () => {
    let filtered = users;

    // Filtre par poste occupé
    if (roleAgenceFilters.length > 0) {
      filtered = filtered.filter(u => {
        const value = u.role_agence || 'null';
        return roleAgenceFilters.includes(value);
      });
    }

    // Filtre par rôle système (OR logic)
    if (systemRoleFilters.length > 0) {
      filtered = filtered.filter(u =>
        u.system_roles?.some(r => systemRoleFilters.includes(r))
      );
    }

    // Filtre par compétences
    if (competenceFilters.length > 0) {
      filtered = filtered.filter(u => {
        const comp = u.service_competencies || {};
        return competenceFilters.some(c => {
          if (c.startsWith('helpconfort_')) {
            const hcValue = c.replace('helpconfort_', '');
            return comp.helpconfort === hcValue;
          }
          return comp[c] === true;
        });
      });
    }

    // Tri
    if (!sortColumn || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

      if (sortColumn === 'created_at') {
        const aTime = new Date(aValue as string).getTime();
        const bTime = new Date(bValue as string).getTime();
        if (aTime < bTime) return sortDirection === 'asc' ? -1 : 1;
        if (aTime > bTime) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aLower = aValue.toLowerCase();
        const bLower = bValue.toLowerCase();
        if (aLower < bLower) return sortDirection === 'asc' ? -1 : 1;
        if (aLower > bLower) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      return 0;
    });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  const sortedUsers = getFilteredAndSortedUsers();
  const hasActiveFilters = roleAgenceFilters.length > 0 || systemRoleFilters.length > 0 || competenceFilters.length > 0;

  const clearAllFilters = () => {
    setRoleAgenceFilters([]);
    setSystemRoleFilters([]);
    setCompetenceFilters([]);
  };

  return (
    <div className="min-h-screen w-full p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Liste des utilisateurs
          </h1>
        </div>
        <Button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Créer un utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Utilisateurs enregistrés</CardTitle>
              <CardDescription>
                {sortedUsers.length} utilisateur{sortedUsers.length > 1 ? 's' : ''} 
                {hasActiveFilters && ` (filtré sur ${users.length})`}
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-1" />
                Effacer les filtres
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    Email
                    <SortIcon column="email" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('last_name')}
                >
                  <div className="flex items-center">
                    Nom
                    <SortIcon column="last_name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('first_name')}
                >
                  <div className="flex items-center">
                    Prénom
                    <SortIcon column="first_name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('agence')}
                >
                  <div className="flex items-center">
                    Agence
                    <SortIcon column="agence" />
                  </div>
                </TableHead>
                <TableHead>
                  <ColumnFilter
                    title="Poste occupé"
                    options={ROLE_AGENCE_OPTIONS}
                    selected={roleAgenceFilters}
                    onChange={setRoleAgenceFilters}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFilter
                    title="Rôle système"
                    options={SYSTEM_ROLE_OPTIONS}
                    selected={systemRoleFilters}
                    onChange={setSystemRoleFilters}
                  />
                </TableHead>
                <TableHead>
                  <ColumnFilter
                    title="Compétences"
                    options={COMPETENCE_OPTIONS}
                    selected={competenceFilters}
                    onChange={setCompetenceFilters}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Créé le
                    <SortIcon column="created_at" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow 
                  key={user.id}
                  onClick={() => {
                    setEditingUser(user);
                    setShowEditDialog(true);
                  }}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div title={!user.must_change_password ? "Utilisateur actif" : "Première connexion non effectuée"}>
                        {!user.must_change_password ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <UserX className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      {user.email || '-'}
                    </div>
                  </TableCell>
                  <TableCell>{user.last_name || '-'}</TableCell>
                  <TableCell>{user.first_name || '-'}</TableCell>
                  <TableCell>{user.agence || '-'}</TableCell>
                  <TableCell>{getRoleLabel(user.role_agence)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.system_roles?.includes('admin') && (
                        <Badge variant="destructive">Admin</Badge>
                      )}
                      {user.system_roles?.includes('franchiseur') && (
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Franchiseur</Badge>
                      )}
                      {user.system_roles?.includes('support') && (
                        <Badge variant="default">Support</Badge>
                      )}
                      {user.system_roles?.length === 1 && user.system_roles[0] === 'user' && (
                        <Badge variant="secondary">Utilisateur</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.system_roles && !user.system_roles.every(r => r === 'user') ? (
                      <div className="flex flex-wrap gap-1">
                        {user.service_competencies?.apogee && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                            Apogée
                          </Badge>
                        )}
                        {user.service_competencies?.apporteurs && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            Apporteurs
                          </Badge>
                        )}
                        {user.service_competencies?.conseil && (
                          <Badge className="bg-purple-500 hover:bg-purple-600 text-white text-xs">
                            Conseil
                          </Badge>
                        )}
                        {user.service_competencies?.helpconfort && (
                          <Badge className="bg-accent hover:bg-accent/90 text-white text-xs">
                            {user.service_competencies.helpconfort === 'animateur_reseau' && 'HC - Animateur'}
                            {user.service_competencies.helpconfort === 'directeur_reseau' && 'HC - Directeur'}
                            {user.service_competencies.helpconfort === 'dg' && 'HC - DG'}
                          </Badge>
                        )}
                        {!user.service_competencies?.apogee && 
                         !user.service_competencies?.apporteurs && 
                         !user.service_competencies?.conseil && 
                         !user.service_competencies?.helpconfort && (
                          <span className="text-xs text-muted-foreground">Aucune</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters ? 'Aucun utilisateur ne correspond aux filtres' : 'Aucun utilisateur enregistré'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    
      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={editingUser}
        onSuccess={loadUsers}
      />
    </div>
  );
}
