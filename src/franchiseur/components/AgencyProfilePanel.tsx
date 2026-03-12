import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Euro, Calendar, Phone, Mail, MapPin, Users, Edit, Loader2, X, TrendingUp, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from '@/config/routes';

interface AgencyProfilePanelProps {
  agencyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AgencyProfilePanelContent({ agencyId, onClose }: { agencyId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: agency, isLoading: agencyLoading } = useAgency(agencyId);
  const { data: royaltyHistory } = useRoyaltyHistory(agencyId);
  const { data: teamMembers = [], isLoading: usersLoading } = useAgencyFullTeam(agencyId);
  const { franchiseurRole } = useFranchiseur();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = usePersistedTab(`franchiseur-agency-${agencyId}-tab`, 'info');

  const canManage = franchiseurRole === "directeur" || franchiseurRole === "dg";

  const handleCreateUser = useCallback((member: AgencyTeamMember) => {
    // Navigate to admin users with pre-fill info
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="p-6 text-center">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Agence non trouvée</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg"
              >
                <Building2 className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  {agency.label}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">{agency.slug}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!agency.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {agency.animateurs && agency.animateurs.length > 0 ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600">
                  {agency.animateurs.length} Animateur{agency.animateurs.length > 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="secondary">Sans animateur</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {canManage && (
              <Button 
                onClick={() => setIsEditDialogOpen(true)}
                size="sm"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                <Edit className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-4 rounded-xl bg-muted/50">
            <TabsTrigger value="info" className="rounded-lg text-xs">Infos</TabsTrigger>
            <TabsTrigger value="team" className="rounded-lg text-xs">Équipe</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg text-xs">Stats</TabsTrigger>
            <TabsTrigger value="royalties" className="rounded-lg text-xs">Redevances</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
          <TabsContent value="info" className="mt-0 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Date d'ouverture</p>
                    <p className="text-sm font-medium">
                      {agency.date_ouverture
                        ? new Date(agency.date_ouverture).toLocaleDateString('fr-FR')
                        : <span className="text-muted-foreground italic">Non renseignée</span>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clôture bilan</p>
                    <p className="text-sm font-medium">
                      {agency.date_cloture_bilan || <span className="text-muted-foreground italic">Non renseignée</span>}
                    </p>
                  </div>
                </div>

                {agency.animateurs && agency.animateurs.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Animateurs réseau</p>
                    <div className="flex flex-wrap gap-1">
                      {agency.animateurs.map(a => (
                        <Badge key={a.id} variant="secondary" className="text-xs">
                          {a.first_name} {a.last_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Coordonnées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Adresse</p>
                  {agency.adresse ? (
                    <p className="text-sm">{agency.adresse}, {agency.code_postal} {agency.ville}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Non renseignée</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="text-sm truncate">{agency.contact_email || <span className="italic text-muted-foreground">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Téléphone
                    </p>
                    <p className="text-sm">{agency.contact_phone || <span className="italic text-muted-foreground">—</span>}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Équipe ({teamMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AgencyTeamList
                  members={teamMembers}
                  isLoading={usersLoading}
                  compact
                  onCreateUser={canManage ? handleCreateUser : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-0">
            <AgencyStatsTab agencySlug={agency.slug} />
          </TabsContent>

          <TabsContent value="royalties" className="mt-0 space-y-4">
            <AgencyRoyaltyModelSelector agencyId={agencyId} canManage={canManage} />
            <AgencyMonthlyRoyaltiesTable agencyId={agencyId} agencySlug={agency.slug} />
            
            {royaltyHistory && royaltyHistory.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    Historique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {royaltyHistory.slice(0, 5).map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(calc.year, calc.month - 1).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CA: {formatEuros(calc.ca_cumul_annuel)}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-amber-600">
                          {formatEuros(calc.redevance_calculee)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <AgencyProfileDialog
        agencyId={agencyId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        canManage={canManage}
      />
    </div>
  );
}

export function AgencyProfilePanel({ agencyId, open, onOpenChange }: AgencyProfilePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] sm:max-w-[600px] p-0 overflow-hidden"
      >
        {agencyId && (
          <ApiToggleProvider>
            <AgencyProvider>
              <FiltersProvider>
                <AgencyProfilePanelContent agencyId={agencyId} onClose={() => onOpenChange(false)} />
              </FiltersProvider>
            </AgencyProvider>
          </ApiToggleProvider>
        )}
      </SheetContent>
    </Sheet>
  );
}
