import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { useFranchiseurStatsStatia } from "@/franchiseur/hooks/useFranchiseurStatsStatia";
import { NetworkPeriodSelector } from "@/franchiseur/components/filters/NetworkPeriodSelector";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import type { TechUniversStats } from "@/shared/utils/technicienUniversEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FranchiseurPageHeader } from "../components/layout/FranchiseurPageHeader";
import { FranchiseurPageContainer } from "../components/layout/FranchiseurPageContainer";

const UNIVERSES = [
  { slug: "pmr", label: "Aménagement PMR", colorHex: "#2B15E0" },
  { slug: "volet_roulant", label: "Volets roulants", colorHex: "#9817F0" },
  { slug: "renovation", label: "Rénovation", colorHex: "#A38D77" },
  { slug: "electricite", label: "Électricité", colorHex: "#FD9A2C" },
  { slug: "plomberie", label: "Plomberie", colorHex: "#3BA6FF" },
  { slug: "serrurerie", label: "Serrurerie", colorHex: "#FF12BD" },
  { slug: "vitrerie", label: "Vitrerie", colorHex: "#7FFE2E" },
  { slug: "menuiserie", label: "Menuiserie", colorHex: "#FF7018" },
];

export default function FranchiseurStats() {
  const [techMode, setTechMode] = useState<"ca" | "heures" | "caParHeure">("ca");
  
  const { data, isLoading, error } = useFranchiseurStatsStatia();

  if (isLoading && !data.agenciesLoaded) {
    return (
      <FranchiseurPageContainer>
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </FranchiseurPageContainer>
    );
  }

  const adaptedTechStats: TechUniversStats[] = (data?.technicienStats || []).slice(0, 10);

  return (
    <FranchiseurPageContainer>
      <FranchiseurPageHeader
        title="Tableaux Statistiques"
        subtitle="Matrices univers, apporteurs et techniciens du réseau"
        icon={<BarChart3 className="h-6 w-6 text-helpconfort-blue" />}
        actions={<NetworkPeriodSelector />}
      />

      {/* Info agences */}
      {data.agenciesTotal > 0 && (
        <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Données agrégées de <span className="font-semibold text-foreground">{data.agenciesLoaded}</span> agence{data.agenciesLoaded > 1 ? 's' : ''}
              </span>
              {isLoading && (
                <div className="flex items-center gap-2">
                  <Progress value={33} className="w-32 h-2" />
                  <span className="text-xs text-muted-foreground">Chargement...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="rounded-2xl border-destructive">
          <CardContent className="py-4 text-destructive">
            Erreur lors du chargement des données: {String(error)}
          </CardContent>
        </Card>
      )}

      {/* Matrice Univers × Apporteurs */}
      <UniversApporteurMatrix
        data={data?.universApporteurMatrix || {}}
        universes={UNIVERSES}
        loading={isLoading}
      />

      {/* Matrice Univers × Techniciens */}
      <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 to-transparent">
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              TOP 10 Collaborateurs du Réseau
            </h3>
            <p className="text-sm text-muted-foreground">
              Meilleurs collaborateurs par CA, heures et performance sur l'ensemble du réseau
            </p>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : adaptedTechStats.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <Tabs value={techMode} onValueChange={(v) => setTechMode(v as "ca" | "heures" | "caParHeure")} className="space-y-4">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-auto min-w-full sm:w-full sm:max-w-md sm:grid sm:grid-cols-3">
                  <TabsTrigger value="ca">CA HT</TabsTrigger>
                  <TabsTrigger value="heures">Heures</TabsTrigger>
                  <TabsTrigger value="caParHeure">CA/Heure</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="ca">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="ca"
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>

              <TabsContent value="heures">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="heures"
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>

              <TabsContent value="caParHeure">
                <TechnicienUniversHeatmap
                  data={adaptedTechStats}
                  universes={UNIVERSES}
                  loading={false}
                  mode="caParHeure"
                  showInactive={false}
                  hideInactiveToggle
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </FranchiseurPageContainer>
  );
}
