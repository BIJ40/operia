/**
 * Page Admin - Collaborateurs non inscrits (toutes agences)
 * Accessible aux N5+ (platform_admin)
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnregisteredCollaborators } from "@/features/team/hooks";
import { useAdminAgencies } from "@/hooks/use-admin-agencies";
import { AgencyCollaborator } from "@/features/team/types";
import { CollaboratorsTable, CreateUserFromCollaboratorDialog } from "@/features/team/components";

export default function AdminCollaborators() {
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [createUserTarget, setCreateUserTarget] = useState<AgencyCollaborator | null>(null);

  const { data: agencies = [] } = useAdminAgencies();
  const { data: collaborators = [], isLoading, refetch } = useUnregisteredCollaborators(
    agencyFilter === "all" ? null : agencyFilter
  );

  // Créer un map agence_id -> label
  const agencyLabels = agencies.reduce((acc, agency) => {
    acc[agency.id] = agency.label;
    return acc;
  }, {} as Record<string, string>);

  const handleCreateUser = (collaborator: AgencyCollaborator) => {
    setCreateUserTarget(collaborator);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collaborateurs non inscrits</h1>
          <p className="text-muted-foreground">
            Gérez les collaborateurs sans compte utilisateur
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {collaborators.length} non inscrit{collaborators.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des collaborateurs</CardTitle>
              <CardDescription>
                Collaborateurs en attente de création de compte
              </CardDescription>
            </div>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrer par agence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun collaborateur non inscrit</h3>
              <p className="text-muted-foreground">
                Tous les collaborateurs ont un compte utilisateur.
              </p>
            </div>
          ) : (
            <CollaboratorsTable
              collaborators={collaborators}
              showAgency
              agencyLabels={agencyLabels}
              onCreateUser={handleCreateUser}
              canCreateUser
              canDelete
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog création utilisateur */}
      <CreateUserFromCollaboratorDialog
        open={!!createUserTarget}
        onOpenChange={(open) => !open && setCreateUserTarget(null)}
        collaborator={createUserTarget}
        agencyLabel={createUserTarget ? agencyLabels[createUserTarget.agency_id] : undefined}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
