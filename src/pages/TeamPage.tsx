/**
 * Page Équipe - Gestion des collaborateurs de l'agence
 * Accessible aux N2+ (franchisee_admin)
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, UserCircle, Loader2 } from "lucide-react";
import {
  useAgencyCollaborators,
  useCreateAgencyCollaborator,
  useUpdateAgencyCollaborator,
  useDeleteAgencyCollaborator,
} from "@/features/team/hooks";
import { useAgencyUsers } from "@/franchiseur/hooks/useAgencyUsers";
import { AgencyCollaborator, CreateCollaboratorPayload, UpdateCollaboratorPayload } from "@/features/team/types";
import { CollaboratorFormDialog, CollaboratorsTable, CreateUserFromCollaboratorDialog } from "@/features/team/components";
import { GLOBAL_ROLE_LABELS } from "@/types/globalRoles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TeamPage() {
  const { user, agence, agencyId, hasGlobalRole } = useAuth();

  // Hooks data - agencyId (UUID) pour collaborateurs, agence (slug) pour users
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useAgencyCollaborators(agencyId);
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useAgencyUsers(agence);

  // Mutations
  const createCollaborator = useCreateAgencyCollaborator(agencyId || "");
  const updateCollaborator = useUpdateAgencyCollaborator(agencyId || "");
  const deleteCollaborator = useDeleteAgencyCollaborator(agencyId || "");

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<AgencyCollaborator | null>(null);
  const [createUserTarget, setCreateUserTarget] = useState<AgencyCollaborator | null>(null);

  // Filtrer les collaborateurs non inscrits
  const unregisteredCollaborators = collaborators.filter((c) => !c.is_registered_user);

  // Permissions
  const canCreateUser = hasGlobalRole("franchisee_admin"); // N2+
  const canDelete = hasGlobalRole("franchisor_user"); // N3+

  const handleSubmit = (data: CreateCollaboratorPayload | UpdateCollaboratorPayload) => {
    if ("id" in data) {
      updateCollaborator.mutate(data, {
        onSuccess: () => {
          setIsFormOpen(false);
          setEditingCollaborator(null);
        },
      });
    } else {
      createCollaborator.mutate(data, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (collaborator: AgencyCollaborator) => {
    setEditingCollaborator(collaborator);
    setIsFormOpen(true);
  };

  const handleDelete = (collaborator: AgencyCollaborator) => {
    deleteCollaborator.mutate(collaborator.id);
  };

  const handleCreateUser = (collaborator: AgencyCollaborator) => {
    setCreateUserTarget(collaborator);
  };

  if (!agencyId && !agence) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune agence associée</h2>
          <p className="text-muted-foreground">
            Vous devez être rattaché à une agence pour accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon équipe</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre agence
          </p>
        </div>
      </div>

      <Tabs defaultValue="registered" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registered" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Utilisateurs inscrits
            <Badge variant="secondary" className="ml-1">
              {registeredUsers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaborateurs
            {unregisteredCollaborators.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unregisteredCollaborators.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Onglet Utilisateurs inscrits */}
        <TabsContent value="registered">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs inscrits</CardTitle>
              <CardDescription>
                Utilisateurs ayant un compte sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : registeredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur inscrit
                </div>
              ) : (
                <div className="space-y-2">
                  {registeredUsers.map((registeredUser) => (
                    <div
                      key={registeredUser.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {registeredUser.first_name?.[0]}
                            {registeredUser.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {registeredUser.first_name} {registeredUser.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {registeredUser.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {registeredUser.role_agence && (
                          <Badge variant="outline">{registeredUser.role_agence}</Badge>
                        )}
                        {registeredUser.global_role && (
                          <Badge variant="secondary">
                            {GLOBAL_ROLE_LABELS[registeredUser.global_role as keyof typeof GLOBAL_ROLE_LABELS] || registeredUser.global_role}
                          </Badge>
                        )}
                        {registeredUser.is_active === false && (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Collaborateurs */}
        <TabsContent value="collaborators">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collaborateurs non inscrits</CardTitle>
                <CardDescription>
                  Personnes de l'équipe n'ayant pas encore de compte
                </CardDescription>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingCollaborators ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <CollaboratorsTable
                  collaborators={unregisteredCollaborators}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCreateUser={handleCreateUser}
                  canDelete={canDelete}
                  canCreateUser={canCreateUser}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog création/édition */}
      <CollaboratorFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingCollaborator(null);
        }}
        collaborator={editingCollaborator}
        onSubmit={handleSubmit}
        isLoading={createCollaborator.isPending || updateCollaborator.isPending}
      />

      {/* Dialog création utilisateur */}
      <CreateUserFromCollaboratorDialog
        open={!!createUserTarget}
        onOpenChange={(open) => !open && setCreateUserTarget(null)}
        collaborator={createUserTarget}
        agencyLabel={agence || undefined}
        onSuccess={() => {
          // Refetch après création
          setCreateUserTarget(null);
        }}
      />
    </div>
  );
}
