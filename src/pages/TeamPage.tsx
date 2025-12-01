/**
 * Page Équipe - Gestion des collaborateurs de l'agence
 * Accessible aux N2+ (franchisee_admin)
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/config/routes";
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
import { TeamUserDialog } from "@/features/team/components";
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
  const { agence, agencyId: authAgencyId, hasGlobalRole } = useAuth();

  // Résoudre l'agency_id depuis le slug si nécessaire
  const { data: resolvedAgency } = useQuery({
    queryKey: ["resolveAgencyBySlug", agence],
    enabled: !authAgencyId && !!agence,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apogee_agencies")
        .select("id, label")
        .eq("slug", agence)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Utiliser l'ID résolu ou celui du context
  const agencyId = authAgencyId || resolvedAgency?.id || null;

  // Hooks data
  const { data: collaborators = [], isLoading: isLoadingCollaborators } = useAgencyCollaborators(agencyId);
  const { data: registeredUsers = [], isLoading: isLoadingUsers } = useAgencyUsers(agence);

  // Mutations
  const createCollaborator = useCreateAgencyCollaborator(agencyId);
  const updateCollaborator = useUpdateAgencyCollaborator(agencyId || "");
  const deleteCollaborator = useDeleteAgencyCollaborator(agencyId || "");

  // UI state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  // Permissions
  const canCreateUser = hasGlobalRole("franchisee_admin"); // N2+

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

    // Trier par nom
    return members.sort((a, b) => 
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    );
  }, [registeredUsers]);

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
              <Link to={ROUTES.reseau.agences}>Voir les agences</Link>
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
        <Button onClick={() => setIsCreateUserOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      <div className="group rounded-xl border border-helpconfort-blue/20 p-0 overflow-hidden
        bg-gradient-to-br from-white to-helpconfort-blue/5
        shadow-sm transition-all duration-300
        hover:to-helpconfort-blue/10 hover:shadow-lg">
        <CardHeader className="border-b border-helpconfort-blue/10">
          <CardTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-helpconfort-blue/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-helpconfort-blue" />
            </div>
            <span>Équipe ({teamMembers.length})</span>
          </CardTitle>
          <CardDescription>
            Liste complète des membres de l'agence
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-2"
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

                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end sm:justify-start mt-2 sm:mt-0">
                    {/* Poste */}
                    <Badge variant="outline" className="text-xs sm:text-sm">{member.role}</Badge>

                    {/* Statut compte */}
                    {member.hasAccount ? (
                      <>
                        <Badge variant="default" className="bg-green-600 text-xs sm:text-sm">
                          <span className="hidden sm:inline">Compte actif</span>
                          <span className="sm:hidden">Actif</span>
                        </Badge>
                        {member.globalRole && (
                          <Badge variant="secondary" className="text-xs sm:text-sm hidden md:inline-flex">
                            {GLOBAL_ROLE_LABELS[member.globalRole as keyof typeof GLOBAL_ROLE_LABELS] || member.globalRole}
                          </Badge>
                        )}
                        {member.isActive === false && (
                          <Badge variant="destructive" className="text-xs sm:text-sm">Inactif</Badge>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      {/* Dialog création utilisateur */}
      <TeamUserDialog
        open={isCreateUserOpen}
        onOpenChange={setIsCreateUserOpen}
        agencyLabel={agence || ""}
        onSuccess={() => setIsCreateUserOpen(false)}
      />
    </div>
  );
}
