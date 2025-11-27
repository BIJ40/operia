import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, Building2 } from "lucide-react";
import { AssignFranchiseurRoleDialog } from "@/components/admin/franchiseur/AssignFranchiseurRoleDialog";
import { ManageAgencyAssignmentsDialog } from "@/components/admin/franchiseur/ManageAgencyAssignmentsDialog";
import { Badge } from "@/components/ui/badge";

export default function AdminFranchiseurRoles() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showAgenciesDialog, setShowAgenciesDialog] = useState(false);

  // Fetch all users with franchiseur app role
  const { data: franchiseurUsers, isLoading } = useQuery({
    queryKey: ['franchiseur-users'],
    queryFn: async () => {
      // Get users with franchiseur role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'franchiseur');

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      // Get franchiseur roles
      const { data: franchiseurRoles } = await supabase
        .from('franchiseur_roles')
        .select('*')
        .in('user_id', userIds);

      // Get agency assignments for animateurs
      const { data: assignments } = await supabase
        .from('franchiseur_agency_assignments')
        .select('*, apogee_agencies(label)')
        .in('user_id', userIds);

      // Combine data
      return profiles?.map(profile => {
        const franchiseurRole = franchiseurRoles?.find(fr => fr.user_id === profile.id);
        const userAssignments = assignments?.filter(a => a.user_id === profile.id) || [];
        
        return {
          ...profile,
          franchiseur_role: franchiseurRole?.franchiseur_role || null,
          agency_assignments: userAssignments,
        };
      }) || [];
    },
  });

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'dg': return 'bg-purple-500';
      case 'directeur': return 'bg-blue-500';
      case 'animateur': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'dg': return 'DG';
      case 'directeur': return 'Directeur';
      case 'animateur': return 'Animateur';
      default: return 'Non défini';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Gestion des Rôles Franchiseur
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérer les rôles franchiseur et les assignations d'agences
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-l-4 border-l-accent bg-gradient-to-br from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utilisateurs Franchiseur
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : franchiseurUsers?.length === 0 ? (
            <p className="text-muted-foreground">
              Aucun utilisateur avec le rôle franchiseur
            </p>
          ) : (
            <div className="space-y-3">
              {franchiseurUsers?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <Badge className={getRoleBadgeColor(user.franchiseur_role)}>
                        {getRoleLabel(user.franchiseur_role)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    
                    {user.franchiseur_role === 'animateur' && user.agency_assignments.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1 flex-wrap">
                          {user.agency_assignments.map((assignment: any) => (
                            <Badge key={assignment.id} variant="outline" className="text-xs">
                              {assignment.apogee_agencies?.label || 'Agence'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowRoleDialog(true);
                      }}
                      className="rounded-xl"
                    >
                      Rôle
                    </Button>

                    {user.franchiseur_role === 'animateur' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setShowAgenciesDialog(true);
                        }}
                        className="rounded-xl"
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Agences
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <>
          <AssignFranchiseurRoleDialog
            open={showRoleDialog}
            onOpenChange={setShowRoleDialog}
            userId={selectedUserId}
            onSuccess={() => {
              setShowRoleDialog(false);
              setSelectedUserId(null);
            }}
          />

          <ManageAgencyAssignmentsDialog
            open={showAgenciesDialog}
            onOpenChange={setShowAgenciesDialog}
            userId={selectedUserId}
            onSuccess={() => {
              setShowAgenciesDialog(false);
              setSelectedUserId(null);
            }}
          />
        </>
      )}
    </div>
  );
}
