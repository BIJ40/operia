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
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-teal/90 to-warm-blue/70 flex items-center justify-center shadow-sm"
          >
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </motion.div>
        }
        actions={
          canManageAgencies && (
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="gap-2 rounded-xl bg-gradient-to-r from-warm-teal/90 to-warm-blue/80 hover:from-warm-teal hover:to-warm-blue text-primary-foreground"
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

      {/* Grille des agences - 3 colonnes compactes */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgencies?.map((agency, index) => (
          <motion.div
            key={agency.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.01, y: -2 }}
          >
            <Card
              className="cursor-pointer rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              onClick={() => setSelectedAgencyId(agency.id)}
            >
              {/* Gradient accent top - couleur douce */}
              <div className="h-1 bg-gradient-to-r from-warm-teal/80 via-warm-blue/60 to-warm-purple/50" />
              
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-warm-teal/80 to-warm-blue/60 flex items-center justify-center shadow-sm shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate group-hover:text-warm-teal transition-colors">
                        {agency.label}
                      </CardTitle>
                      <CardDescription className="font-mono text-[10px]">
                        {agency.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    {!agency.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>
                    )}
                    {!agency.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-1 pt-0 px-3 pb-3">
                {agency.ville && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-warm-teal" />
                    <span className="truncate">{agency.ville} {agency.code_postal && `(${agency.code_postal})`}</span>
                  </div>
                )}
                
                {agency.date_ouverture && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 shrink-0 text-warm-blue" />
                    <span>Depuis {new Date(agency.date_ouverture).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                
                {agency.contact_email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0 text-warm-purple" />
                    <span className="truncate">{agency.contact_email}</span>
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
