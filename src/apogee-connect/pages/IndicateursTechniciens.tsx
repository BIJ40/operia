import { useState, useMemo } from "react";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { SecondaryPeriodSelector } from "@/apogee-connect/components/filters/SecondaryPeriodSelector";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import { TechnicienMensuelTable } from "@/apogee-connect/components/widgets/TechnicienMensuelTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTechniciensStatia } from "@/statia/hooks/useTechniciensStatia";
import { Users, TrendingUp, Clock, Award } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ROUTES } from "@/config/routes";

export default function IndicateursTechniciens() {
  const { isAgencyReady } = useAgency();
  const { isAuthLoading } = useAuth();
  const [showInactive, setShowInactive] = useState(false);
  
  // Utiliser le hook StatIA
  const {
    technicienUniversStats,
    universes,
    caTotal,
    heuresTotal,
    caParHeureGlobal,
    nbTechniciens,
    topTechniciens,
    caMensuelParTech,
    availableMonths,
    isLoading,
  } = useTechniciensStatia();
  
  // Adapter les données pour le composant TechnicienUniversHeatmap
  const heatmapData = useMemo(() => {
    return technicienUniversStats.map(tech => ({
      technicienId: tech.technicienId,
      technicienNom: tech.technicienNom,
      technicienColor: tech.technicienColor,
      technicienActif: tech.technicienActif,
      universes: Object.fromEntries(
        Object.entries(tech.universes).map(([univers, data]) => [
          univers,
          {
            caHT: data.caHT || 0,
            heures: data.heures || 0,
            caParHeure: data.caParHeure || 0,
            nbDossiers: data.nbDossiers || 0,
          }
        ])
      ),
      totaux: tech.totaux,
    }));
  }, [technicienUniversStats]);

  if (isAuthLoading || !isAgencyReady) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Formateurs
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals }).format(value);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <PageHeader
        title="Techniciens par univers"
        subtitle="Analyse croisée du CA, des heures et de la performance par technicien et domaine"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
        rightElement={<SecondaryPeriodSelector />}
      />
      
      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-helpconfort-blue" />
              Techniciens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : nbTechniciens}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-helpconfort-orange" />
              CA Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(caTotal)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              Heures productives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-20" /> : `${formatNumber(heuresTotal, 1)}h`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-500/5 to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              CA / Heure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-20" /> : `${formatNumber(caParHeureGlobal, 0)}€/h`}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Top 5 Techniciens */}
      {topTechniciens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Techniciens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {topTechniciens.slice(0, 5).map((tech, index) => (
                <div key={tech.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: tech.color || '#6B7280' }}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{tech.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(tech.ca)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tableau mensuel par technicien */}
      <TechnicienMensuelTable 
        data={caMensuelParTech}
        loading={isLoading}
        availableMonths={availableMonths}
      />

      {/* Onglets pour choisir la vue (Heatmap) */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : heatmapData.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] border-2 border-dashed border-muted rounded-2xl">
          <div className="text-center space-y-4">
            <p className="text-2xl font-semibold text-muted-foreground">Aucune donnée disponible</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Aucune activité trouvée pour la période sélectionnée
            </p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="ca" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ca">CA HT</TabsTrigger>
            <TabsTrigger value="heures">Heures</TabsTrigger>
            <TabsTrigger value="caParHeure">CA/Heure</TabsTrigger>
          </TabsList>

          <TabsContent value="ca">
            <TechnicienUniversHeatmap
              data={heatmapData}
              universes={universes}
              loading={isLoading}
              mode="ca"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>

          <TabsContent value="heures">
            <TechnicienUniversHeatmap
              data={heatmapData}
              universes={universes}
              loading={isLoading}
              mode="heures"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>

          <TabsContent value="caParHeure">
            <TechnicienUniversHeatmap
              data={heatmapData}
              universes={universes}
              loading={isLoading}
              mode="caParHeure"
              showInactive={showInactive}
              onToggleInactive={setShowInactive}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
