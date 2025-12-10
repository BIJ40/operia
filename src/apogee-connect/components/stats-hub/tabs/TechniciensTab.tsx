import { useState, useMemo } from "react";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import { TechnicienMensuelTable } from "@/apogee-connect/components/widgets/TechnicienMensuelTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTechniciensStatia } from "@/statia/hooks/useTechniciensStatia";
import { Users, TrendingUp, Clock, Award } from "lucide-react";

export function TechniciensTab() {
  const { isAgencyReady } = useAgency();
  const [showInactive, setShowInactive] = useState(false);
  
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

  if (!isAgencyReady || isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  
  const formatNumber = (value: number, decimals = 0) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals }).format(value);

  return (
    <div className="space-y-8">
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
            <p className="text-2xl font-bold">{nbTechniciens}</p>
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
            <p className="text-2xl font-bold">{formatCurrency(caTotal)}</p>
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
            <p className="text-2xl font-bold">{formatNumber(heuresTotal, 1)}h</p>
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
            <p className="text-2xl font-bold">{formatNumber(caParHeureGlobal, 0)}€/h</p>
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

      {/* Heatmap avec onglets */}
      {heatmapData.length === 0 ? (
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
