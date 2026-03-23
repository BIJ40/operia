import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, Euro, Calendar, Phone, Mail, MapPin, Users, Edit, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistedTab } from "@/hooks/usePersistedState";
import { useAgency } from "../hooks/useAgencies";
import { useRoyaltyHistory } from "../hooks/useRoyaltyConfig";
import { useAgencyFullTeam, type AgencyTeamMember } from "../hooks/useAgencyFullTeam";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Separator } from "@/components/ui/separator";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";
import { AgencyRoyaltyModelSelector } from "../components/AgencyRoyaltyModelSelector";
import { AgencyMonthlyRoyaltiesTable } from "../components/AgencyMonthlyRoyaltiesTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { VISIBLE_ROLE_LABELS } from '@/lib/visibleRoleLabels';
import { AgencyStatsTab } from "../components/AgencyStatsTab";
import { AgencyTeamList } from "../components/AgencyTeamList";
import { ApiToggleProvider } from "@/apogee-connect/contexts/ApiToggleContext";
import { AgencyProvider } from "@/apogee-connect/contexts/AgencyContext";
import { FiltersProvider } from "@/apogee-connect/contexts/FiltersContext";
import { ROUTES } from '@/config/routes';

function FranchiseurAgencyProfileContent() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const navigate = useNavigate();
  const { data: agency, isLoading: agencyLoading } = useAgency(agencyId || null);
  const { data: royaltyHistory } = useRoyaltyHistory(agencyId || null);
  const { data: teamMembers = [], isLoading: usersLoading } = useAgencyFullTeam(agencyId || null);
  const { franchiseurRole } = useFranchiseur();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = usePersistedTab(`franchiseur-agency-${agencyId}-tab`, 'info');

  const canManage = franchiseurRole === "directeur" || franchiseurRole === "dg";

  const handleCreateUser = useCallback((member: AgencyTeamMember) => {
    const params = new URLSearchParams({
      action: 'create',
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email || '',
      agence: agency?.slug || '',
    });
    navigate(`${ROUTES.admin.users}?${params.toString()}`);
  }, [navigate, agency?.slug]);

  if (agencyLoading) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-auto w-auto min-w-full md:w-full md:grid md:grid-cols-4">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="team">Équipe</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="royalties">Redevances</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'ouverture</p>
                    <p className="font-medium">
                      {agency.date_ouverture
                        ? new Date(agency.date_ouverture).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : <span className="text-muted-foreground italic">Non renseignée</span>
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date de clôture bilan</p>
                    <p className="font-medium">
                      {agency.date_cloture_bilan || <span className="text-muted-foreground italic">Non renseignée</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Animateurs réseau</p>
                    <p className="font-medium">
                      {agency.animateurs && agency.animateurs.length > 0
                        ? agency.animateurs.map(a => `${a.first_name} ${a.last_name}`).join(', ')
                        : <span className="text-muted-foreground italic">Non renseigné</span>
                      }
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Coordonnées</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Adresse</p>
                      {agency.adresse ? (
                        <>
                          <p className="text-sm">{agency.adresse}</p>
                          <p className="text-sm text-muted-foreground">
                            {agency.code_postal || ''} {agency.ville || ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Non renseignée</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      {agency.contact_email ? (
                        <a 
                          href={`mailto:${agency.contact_email}`}
                          className="text-sm hover:underline"
                        >
                          {agency.contact_email}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Non renseigné</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Téléphone</p>
                      {agency.contact_phone ? (
                        <a 
                          href={`tel:${agency.contact_phone}`}
                          className="text-sm hover:underline"
                        >
                          {agency.contact_phone}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Non renseigné</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Équipe ({teamMembers.length})
                </CardTitle>
                <CardDescription>
                  Membres de l'agence — inscrits et salariés
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <AgencyTeamList
                members={teamMembers}
                isLoading={usersLoading}
                onCreateUser={canManage ? handleCreateUser : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>KPIs & Statistiques</CardTitle>
              <CardDescription>
                Vue d'ensemble des performances de l'agence sur la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgencyStatsTab agencySlug={agency.slug} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="royalties" className="space-y-4 mt-4">
          {/* Model Selector */}
          <AgencyRoyaltyModelSelector agencyId={agencyId!} canManage={canManage} />

          {/* Monthly CA + Royalties Table */}
          <AgencyMonthlyRoyaltiesTable agencyId={agencyId!} agencySlug={agency.slug} />

          {/* History */}
          {royaltyHistory && royaltyHistory.length > 0 && (
            <Card className="rounded-2xl border-l-4 border-l-accent">
              <CardHeader>
                <CardTitle>Historique des calculs enregistrés</CardTitle>
                <CardDescription>
                  Calculs de redevances sauvegardés pour cette agence
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AgencyProfileDialog
        agencyId={agencyId || null}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        canManage={canManage}
      />
    </div>
  );
}

export default function FranchiseurAgencyProfile() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <FranchiseurAgencyProfileContent />
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
