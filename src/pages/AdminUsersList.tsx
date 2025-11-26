import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, Users, Shield, Key } from 'lucide-react';
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
  system_role?: string;
  must_change_password: boolean | null;
}

const getRoleLabel = (roleValue: string | null): string => {
  if (!roleValue) return '-';
  const roles: Record<string, string> = {
    'dirigeant': 'Dirigeant(e)',
    'assistant(e)': 'Assistant(e)',
    'commercial': 'Commercial',
    'franchiseur': 'Franchiseur',
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

      // Récupérer les rôles système pour chaque utilisateur
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            ...profile,
            system_role: roleData?.role || 'user'
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

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          Liste des utilisateurs
        </h1>
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
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Poste occupé</TableHead>
                <TableHead>Rôle système</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
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
                    <Badge variant={
                      user.system_role === 'admin' ? 'destructive' : 
                      user.system_role === 'support' ? 'default' : 
                      'secondary'
                    }>
                      {user.system_role === 'admin' ? 'Administrateur' : 
                       user.system_role === 'support' ? 'Support' : 
                       'Utilisateur'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditDialog(true);
                        }}
                        title="Modifier les informations"
                      >
                        <Edit className="w-4 h-4 text-primary" />
                      </Button>
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
                      {user.system_role !== 'admin' && (
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
              {users.length === 0 && (
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
