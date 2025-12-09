import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Search, Calendar, Phone, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgencies } from "../hooks/useAgencies";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { ROUTES } from "@/config/routes";
import { FranchiseurPageHeader } from "../components/layout/FranchiseurPageHeader";
import { FranchiseurPageContainer } from "../components/layout/FranchiseurPageContainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function FranchiseurAgencies() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: agencies, isLoading } = useAgencies();
  const { franchiseurRole } = useFranchiseur();
  
  const canManageAgencies = franchiseurRole === 'directeur' || franchiseurRole === 'dg';

  const filteredAgencies = agencies?.filter(agency => {
    const matchesSearch = 
      agency.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.ville?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agency.code_postal?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesActive = showInactive ? true : agency.is_active;
    
    return matchesSearch && matchesActive;
  });

  if (isLoading) {
    return (
      <FranchiseurPageContainer>
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </FranchiseurPageContainer>
    );
  }

  return (
    <FranchiseurPageContainer>
      <FranchiseurPageHeader
        title="Agences du Réseau"
        subtitle={`${filteredAgencies?.length || 0} agence${(filteredAgencies?.length || 0) > 1 ? 's' : ''} dans le réseau`}
        icon={<Building2 className="h-6 w-6 text-helpconfort-blue" />}
        actions={
          canManageAgencies && (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle Agence
            </Button>
          )
        }
      />

      {/* Barre de recherche et filtres */}
      <Card className="rounded-2xl border-helpconfort-blue/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, slug, ville ou code postal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
              className="shrink-0"
            >
              {showInactive ? "Toutes" : "Actives uniquement"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grille des agences */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies?.map((agency) => (
          <Card
            key={agency.id}
            className="cursor-pointer rounded-2xl border-l-4 border-l-helpconfort-blue hover:shadow-lg transition-all hover:scale-[1.02] group"
            onClick={() => navigate(ROUTES.reseau.agenceProfile(agency.id))}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-5 w-5 text-helpconfort-blue shrink-0" />
                  <CardTitle className="text-lg truncate">{agency.label}</CardTitle>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!agency.is_active && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                  {agency.animateurs && agency.animateurs.length > 0 ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                      {agency.animateurs.length} Animateur{agency.animateurs.length > 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Sans animateur
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="font-mono text-xs">
                {agency.slug}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
              {agency.ville && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{agency.ville} {agency.code_postal && `(${agency.code_postal})`}</span>
                </div>
              )}
              
              {agency.date_ouverture && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Ouverte le {new Date(agency.date_ouverture).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
              
              {agency.contact_email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{agency.contact_email}</span>
                </div>
              )}
              
              {agency.contact_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{agency.contact_phone}</span>
                </div>
              )}
              
              {agency.animateurs && agency.animateurs.length > 0 && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t">
                  <Users className="h-4 w-4 text-helpconfort-blue shrink-0" />
                  <span className="font-medium truncate">
                    {agency.animateurs.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgencies?.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune agence trouvée</p>
          </CardContent>
        </Card>
      )}

      {isCreateDialogOpen && (
        <AgencyProfileDialog
          agencyId={null}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          canManage={canManageAgencies}
        />
      )}
    </FranchiseurPageContainer>
  );
}
