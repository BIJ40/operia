import { useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, TrendingUp, Euro, Calendar, Phone, Mail, MapPin, Users, Edit, UserCircle, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgency } from "../hooks/useAgencies";
import { useRoyaltyHistory } from "../hooks/useRoyaltyConfig";
import { useAgencyUsers } from "../hooks/useAgencyUsers";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Separator } from "@/components/ui/separator";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GLOBAL_ROLE_LABELS } from "@/types/globalRoles";
import {
  useAgencyCollaborators,
  useCreateAgencyCollaborator,
  useUpdateAgencyCollaborator,
  useDeleteAgencyCollaborator,
} from "@/features/team/hooks";
import { AgencyCollaborator, CreateCollaboratorPayload, UpdateCollaboratorPayload } from "@/features/team/types";
import { CollaboratorFormDialog, CollaboratorsTable, CreateUserFromCollaboratorDialog } from "@/features/team/components";

export default function FranchiseurAgencyProfile() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { data: agency, isLoading: agencyLoading } = useAgency(agencyId || null);
  const { data: royaltyHistory } = useRoyaltyHistory(agencyId || null);
  const { data: agencyUsers, isLoading: usersLoading } = useAgencyUsers(agency?.slug || null);
  const { franchiseurRole } = useFranchiseur();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Collaborators state
  const { data: collaborators = [], isLoading: collaboratorsLoading } = useAgencyCollaborators(agencyId || null);
  const createCollaborator = useCreateAgencyCollaborator(agencyId || "");
  const updateCollaborator = useUpdateAgencyCollaborator(agencyId || "");
  const deleteCollaborator = useDeleteAgencyCollaborator(agencyId || "");
  const [isCollaboratorFormOpen, setIsCollaboratorFormOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<AgencyCollaborator | null>(null);
  const [createUserTarget, setCreateUserTarget] = useState<AgencyCollaborator | null>(null);

  const canManage = franchiseurRole === "directeur" || franchiseurRole === "dg";
  const unregisteredCollaborators = collaborators.filter((c) => !c.is_registered_user);

  const handleCollaboratorSubmit = (data: CreateCollaboratorPayload | UpdateCollaboratorPayload) => {
    if ("id" in data) {
      updateCollaborator.mutate(data, {
        onSuccess: () => {
          setIsCollaboratorFormOpen(false);
          setEditingCollaborator(null);
        },
      });
    } else {
      createCollaborator.mutate(data, {
        onSuccess: () => setIsCollaboratorFormOpen(false),
      });
    }
  };

  if (agencyLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="container mx-auto p-6">
        <Card className="rounded-2xl border-l-4 border-l-destructive">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Agence non trouvée</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
              {agency.label}
            </h1>
            {!agency.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {agency.animateurs && agency.animateurs.length > 0 ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                {agency.animateurs.length} Animateur{agency.animateurs.length > 1 ? 's' : ''}
              </Badge>
            ) : (
              <Badge variant="secondary">
                Sans animateur
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {agency.slug}
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={() => setIsEditDialogOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-primary to-helpconfort-blue-dark border-l-4 border-l-accent shadow-lg hover:shadow-xl transition-all"
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="royalties">Redevances</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {agency.date_ouverture && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'ouverture</p>
                      <p className="font-medium">
                        {new Date(agency.date_ouverture).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {agency.animateurs && agency.animateurs.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Animateurs réseau</p>
                      <p className="font-medium">
                        {agency.animateurs.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Coordonnées</h3>
                <div className="space-y-3">
                  {agency.adresse && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">{agency.adresse}</p>
                        {(agency.ville || agency.code_postal) && (
                          <p className="text-sm text-muted-foreground">
                            {agency.code_postal} {agency.ville}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {agency.contact_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={`mailto:${agency.contact_email}`}
                        className="text-sm hover:underline"
                      >
                        {agency.contact_email}
                      </a>
                    </div>
                  )}

                  {agency.contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={`tel:${agency.contact_phone}`}
                        className="text-sm hover:underline"
                      >
                        {agency.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          {/* Utilisateurs inscrits */}
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Utilisateurs inscrits
                <Badge variant="secondary" className="ml-2">{agencyUsers?.length || 0}</Badge>
              </CardTitle>
              <CardDescription>
                Utilisateurs ayant un compte sur la plateforme
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : agencyUsers && agencyUsers.length > 0 ? (
                <div className="space-y-2">
                  {agencyUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        user.is_active === false ? 'opacity-50 bg-muted/30' : 'bg-card hover:bg-muted/30'
                      } transition-colors`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.first_name?.[0] || ''}{user.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.first_name} {user.last_name}
                          {user.is_active === false && (
                            <span className="text-muted-foreground ml-2 text-xs">(inactif)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {user.role_agence && (
                          <Badge variant="outline" className="text-xs">
                            {user.role_agence}
                          </Badge>
                        )}
                        {user.global_role && (
                          <Badge 
                            variant={
                              user.global_role === 'franchisee_admin' ? 'default' : 
                              user.global_role === 'franchisee_user' ? 'secondary' : 
                              'outline'
                            }
                            className="text-xs"
                          >
                            {GLOBAL_ROLE_LABELS[user.global_role as keyof typeof GLOBAL_ROLE_LABELS] || user.global_role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Aucun utilisateur inscrit</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collaborateurs non inscrits */}
          <Card className="rounded-2xl border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Collaborateurs non inscrits
                  {unregisteredCollaborators.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{unregisteredCollaborators.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Membres de l'équipe sans compte utilisateur
                </CardDescription>
              </div>
              {canManage && (
                <Button onClick={() => setIsCollaboratorFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {collaboratorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <CollaboratorsTable
                  collaborators={unregisteredCollaborators}
                  onEdit={(c) => {
                    setEditingCollaborator(c);
                    setIsCollaboratorFormOpen(true);
                  }}
                  onDelete={(c) => deleteCollaborator.mutate(c.id)}
                  onCreateUser={(c) => setCreateUserTarget(c)}
                  canDelete={canManage}
                  canCreateUser={canManage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>KPIs & Statistiques</CardTitle>
              <CardDescription>
                Vue d'ensemble des performances de l'agence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Statistiques de l'agence</p>
                <p className="text-sm mt-2">
                  Les KPIs seront affichés ici en se connectant aux données Apogée
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="royalties" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Historique des Redevances</CardTitle>
              <CardDescription>
                Derniers calculs de redevances pour cette agence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {royaltyHistory && royaltyHistory.length > 0 ? (
                <div className="space-y-3">
                  {royaltyHistory.map((calc) => (
                    <Card key={calc.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {new Date(calc.year, calc.month - 1).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CA cumulé: {formatEuros(calc.ca_cumul_annuel)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatEuros(calc.redevance_calculee)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(calc.calculated_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Euro className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun historique de redevances</p>
                  <p className="text-sm mt-2">
                    Les calculs de redevances apparaîtront ici une fois effectués
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AgencyProfileDialog
        agencyId={agencyId || null}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        canManage={canManage}
      />

      <CollaboratorFormDialog
        open={isCollaboratorFormOpen}
        onOpenChange={(open) => {
          setIsCollaboratorFormOpen(open);
          if (!open) setEditingCollaborator(null);
        }}
        collaborator={editingCollaborator}
        onSubmit={handleCollaboratorSubmit}
        isLoading={createCollaborator.isPending || updateCollaborator.isPending}
      />

      <CreateUserFromCollaboratorDialog
        open={!!createUserTarget}
        onOpenChange={(open) => !open && setCreateUserTarget(null)}
        collaborator={createUserTarget}
        agencyLabel={agency?.label}
      />
    </div>
  );
}
