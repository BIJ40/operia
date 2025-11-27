import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, Users, Shield, Key, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EditUserDialog } from '@/components/EditUserDialog';
import { ManageSystemRoleDialog } from '@/components/ManageSystemRoleDialog';
import { ManageUserPermissionsDialog } from '@/components/ManageUserPermissionsDialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, UserX } from 'lucide-react';

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

export default function AdminUsersList() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [managingRoleUserId, setManagingRoleUserId] = useState<string | null>(null);
  const [managingRoleUserName, setManagingRoleUserName] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<UserProfile | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

      // Récupérer TOUS les rôles système pour chaque utilisateur
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
      // Cycle: asc -> desc -> null
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

  const getSortedUsers = () => {
    if (!sortColumn || !sortDirection) return users;

    return [...users].sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Traiter les valeurs nulles
      if (aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === null) return sortDirection === 'asc' ? -1 : 1;

      // Comparaison pour les dates
      if (sortColumn === 'created_at') {
        const aTime = new Date(aValue as string).getTime();
        const bTime = new Date(bValue as string).getTime();
        if (aTime < bTime) return sortDirection === 'asc' ? -1 : 1;
        if (aTime > bTime) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      // Comparaison pour les chaînes (case-insensitive)
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

  const sortedUsers = getSortedUsers();

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
          <CardTitle>Utilisateurs enregistrés</CardTitle>
          <CardDescription>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} au total
          </CardDescription>
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
                <TableHead>Poste occupé</TableHead>
                <TableHead>Rôle système</TableHead>
                <TableHead>Compétences</TableHead>
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
                        onClick={() => {
                          setManagingPermissionsUser(user);
                          setShowPermissionsDialog(true);
                        }}
                        title="Gérer les permissions individuelles"
                      >
                        <Key className="w-4 h-4 text-accent" />
                      </Button>
                      {!user.system_roles?.includes('admin') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                          setManagingRoleUserId(user.id);
                            setManagingRoleUserName(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur');
                            setShowRoleDialog(true);
                          }}
                          title="Gérer le rôle système"
                        >
                          <Shield className="w-4 h-4 text-blue-500" />
                        </Button>
                      )}
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur enregistré
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

      <ManageSystemRoleDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        userId={managingRoleUserId}
        userName={managingRoleUserName}
        onSuccess={loadUsers}
      />

      <ManageUserPermissionsDialog
        open={showPermissionsDialog}
        onOpenChange={setShowPermissionsDialog}
        userId={managingPermissionsUser?.id || ''}
        userName={`${managingPermissionsUser?.first_name || ''} ${managingPermissionsUser?.last_name || ''}`.trim() || 'Utilisateur'}
        userRole={managingPermissionsUser?.role_agence || null}
      />
    </div>
  );
}
