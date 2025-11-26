import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, Search, Users, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgencies } from "../hooks/useAgencies";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";
import { useFranchiseur } from "../contexts/FranchiseurContext";

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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Gestion des Agences
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredAgencies?.length || 0} agences dans le réseau
          </p>
        </div>
        
        {canManageAgencies && (
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-helpconfort-blue-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Agence
          </Button>
        )}
      </div>

      <Card className="rounded-2xl border-l-4 border-l-accent">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
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
            >
              {showInactive ? "Toutes" : "Actives uniquement"}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgencies?.map((agency) => (
              <Card
                key={agency.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] rounded-2xl border-l-4 border-l-primary"
                onClick={() => navigate(`/tete-de-reseau/agences/${agency.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{agency.label}</CardTitle>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!agency.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      {agency.animateur_profile ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                          Animateur
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
                      <MapPin className="h-4 w-4" />
                      <span>{agency.ville} {agency.code_postal && `(${agency.code_postal})`}</span>
                    </div>
                  )}
                  
                  {agency.date_ouverture && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Ouverte le {new Date(agency.date_ouverture).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  
                  {agency.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{agency.contact_email}</span>
                    </div>
                  )}
                  
                  {agency.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{agency.contact_phone}</span>
                    </div>
                  )}
                  
                  {agency.animateur_profile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {agency.animateur_profile.first_name} {agency.animateur_profile.last_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAgencies?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune agence trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isCreateDialogOpen && (
        <AgencyProfileDialog
          agencyId={null}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          canManage={canManageAgencies}
        />
      )}
    </div>
  );
}
