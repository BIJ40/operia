import { useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, TrendingUp, Euro, Calendar, Phone, Mail, MapPin, Users, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgency } from "../hooks/useAgencies";
import { useRoyaltyHistory } from "../hooks/useRoyaltyConfig";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Separator } from "@/components/ui/separator";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";

export default function FranchiseurAgencyProfile() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const { data: agency, isLoading: agencyLoading } = useAgency(agencyId || null);
  const { data: royaltyHistory } = useRoyaltyHistory(agencyId || null);
  const { franchiseurRole } = useFranchiseur();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const canManage = franchiseurRole === "directeur" || franchiseurRole === "dg";

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
            {agency.animateur_profile ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Animateur assigné
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Informations</TabsTrigger>
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

                {agency.animateur_profile && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Animateur réseau</p>
                      <p className="font-medium">
                        {agency.animateur_profile.first_name} {agency.animateur_profile.last_name}
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
    </div>
  );
}
