import { useState } from "react";
import { Building2, Plus, Search, Calendar, Phone, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgencies } from "../hooks/useAgencies";
import { AgencyProfileDialog } from "../components/AgencyProfileDialog";
import { AgencyProfilePanel } from "../components/AgencyProfilePanel";
import { useFranchiseur } from "../contexts/FranchiseurContext";
import { FranchiseurPageHeader } from "../components/layout/FranchiseurPageHeader";
import { FranchiseurPageContainer } from "../components/layout/FranchiseurPageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function FranchiseurAgencies() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  
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
        icon={
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg"
          >
            <Building2 className="h-5 w-5 text-white" />
          </motion.div>
        }
        actions={
          canManageAgencies && (
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-4 w-4" />
              Nouvelle Agence
            </Button>
          )
        }
      />

      {/* Barre de recherche et filtres */}
      <Card className="rounded-2xl border-0 shadow-md bg-white dark:bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, slug, ville ou code postal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl border-0 bg-muted/50"
              />
            </div>
            
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
              className="shrink-0 rounded-xl"
            >
              {showInactive ? "Toutes" : "Actives uniquement"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grille des agences */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies?.map((agency, index) => (
          <motion.div
            key={agency.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card
              className="cursor-pointer rounded-2xl border-0 shadow-md hover:shadow-xl transition-all overflow-hidden group"
              onClick={() => setSelectedAgencyId(agency.id)}
            >
              {/* Gradient accent top */}
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shrink-0">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-emerald-600 transition-colors">
                        {agency.label}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {agency.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!agency.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                    {agency.animateurs && agency.animateurs.length > 0 ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                        {agency.animateurs.length} Anim.
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sans anim.
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 pt-0">
                {agency.ville && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="truncate">{agency.ville} {agency.code_postal && `(${agency.code_postal})`}</span>
                  </div>
                )}
                
                {agency.date_ouverture && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0 text-blue-500" />
                    <span>Depuis {new Date(agency.date_ouverture).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                
                {agency.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-violet-500" />
                    <span className="truncate">{agency.contact_email}</span>
                  </div>
                )}
                
                {agency.animateurs && agency.animateurs.length > 0 && (
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <Users className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium truncate text-amber-700 dark:text-amber-400">
                      {agency.animateurs.map(a => `${a.first_name} ${a.last_name}`).join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredAgencies?.length === 0 && (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucune agence trouvée</p>
          </CardContent>
        </Card>
      )}

      {/* Panel de profil d'agence */}
      <AgencyProfilePanel
        agencyId={selectedAgencyId}
        open={!!selectedAgencyId}
        onOpenChange={(open) => !open && setSelectedAgencyId(null)}
      />

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
