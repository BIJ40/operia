/**
 * Page Équipe - Gestion des collaborateurs de l'agence
 * Accessible aux N2+ (franchisee_admin)
 */

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Loader2, UserPlus } from "lucide-react";
import {
  useAgencyCollaborators,
  useCreateAgencyCollaborator,
  useUpdateAgencyCollaborator,
  useDeleteAgencyCollaborator,
} from "@/features/team/hooks";
import { useAgencyUsers } from "@/franchiseur/hooks/useAgencyUsers";
import { AgencyCollaborator, CreateCollaboratorPayload, UpdateCollaboratorPayload, COLLABORATOR_ROLE_LABELS } from "@/features/team/types";
import { CollaboratorFormDialog, CreateUserFromCollaboratorDialog } from "@/features/team/components";
import { GLOBAL_ROLE_LABELS } from "@/types/globalRoles";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Type unifié pour la liste
interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  role: string;
  hasAccount: boolean;
  isActive?: boolean;
  globalRole?: string | null;
  // Pour les collaborateurs sans compte
  collaborator?: AgencyCollaborator;
}

export default function TeamPage() {
  const { agence, agencyId, hasGlobalRole } = useAuth();

  // Hooks data
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useAgencyCollaborators(agencyId);
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useAgencyUsers(agence);

  // Mutations
  const createCollaborator = useCreateAgencyCollaborator(agencyId);
  const updateCollaborator = useUpdateAgencyCollaborator(agencyId || "");
  const deleteCollaborator = useDeleteAgencyCollaborator(agencyId || "");

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<AgencyCollaborator | null>(null);
  const [createUserTarget, setCreateUserTarget] = useState<AgencyCollaborator | null>(null);

  // Permissions
  const canCreateUser = hasGlobalRole("franchisee_admin"); // N2+
  const canDelete = hasGlobalRole("franchisor_user"); // N3+

  // Fusionner users inscrits + collaborateurs en une seule liste
  const teamMembers = useMemo((): TeamMember[] => {
    const members: TeamMember[] = [];

    // Ajouter les utilisateurs inscrits
    registeredUsers.forEach((user) => {
      members.push({
        id: `user-${user.id}`,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email,
        role: user.role_agence || "Utilisateur",
        hasAccount: true,
        isActive: user.is_active !== false,
        globalRole: user.global_role,
      });
    });

    // Ajouter les collaborateurs NON inscrits
    collaborators
      .filter((c) => !c.is_registered_user)
      .forEach((collab) => {
        members.push({
          id: `collab-${collab.id}`,
          first_name: collab.first_name,
          last_name: collab.last_name,
          email: collab.email,
          role: COLLABORATOR_ROLE_LABELS[collab.role] || collab.role,
          hasAccount: false,
          collaborator: collab,
        });
      });

    // Trier par nom
    return members.sort((a, b) => 
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    );
  }, [registeredUsers, collaborators]);

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

  // Pour les N3+, rediriger vers l'interface franchiseur
  const isN3Plus = hasGlobalRole("franchisor_user");
  
  if (!agencyId && !agence) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune agence associée</h2>
          <p className="text-muted-foreground mb-4">
            {isN3Plus 
              ? "En tant que membre du réseau, accédez aux équipes via la gestion des agences."
              : "Vous devez être rattaché à une agence pour accéder à cette page."
            }
          </p>
          {isN3Plus && (
            <Button asChild>
              <a href="/reseau/agences">Voir les agences</a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isLoading = isLoadingCollaborators || isLoadingUsers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon équipe</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre agence
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un membre
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Équipe ({teamMembers.length})
          </CardTitle>
          <CardDescription>
            Liste complète des membres de l'agence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun membre dans l'équipe
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={member.hasAccount ? "bg-primary/10" : "bg-muted"}>
                        {member.first_name?.[0]}
                        {member.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.email || "Pas d'email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Poste */}
                    <Badge variant="outline">{member.role}</Badge>

                    {/* Statut compte */}
                    {member.hasAccount ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          Compte actif
                        </Badge>
                        {member.globalRole && (
                          <Badge variant="secondary">
                            {GLOBAL_ROLE_LABELS[member.globalRole as keyof typeof GLOBAL_ROLE_LABELS] || member.globalRole}
                          </Badge>
                        )}
                        {member.isActive === false && (
                          <Badge variant="destructive">Inactif</Badge>
                        )}
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">Sans compte</Badge>
                        {canCreateUser && member.collaborator && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateUser(member.collaborator!)}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Créer compte
                          </Button>
                        )}
                      </>
                    )}

                    {/* Actions pour collaborateurs non inscrits */}
                    {!member.hasAccount && member.collaborator && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(member.collaborator!)}
                        >
                          Modifier
                        </Button>
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(member.collaborator!)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          setCreateUserTarget(null);
        }}
      />
    </div>
  );
}
