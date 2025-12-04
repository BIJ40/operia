import { useState } from "react";
import { useFranchiseurStatsStatia } from "@/franchiseur/hooks/useFranchiseurStatsStatia";
import { NetworkPeriodSelector } from "@/franchiseur/components/filters/NetworkPeriodSelector";
import { UniversApporteurMatrix } from "@/apogee-connect/components/widgets/UniversApporteurMatrix";
import { TechnicienUniversHeatmap } from "@/apogee-connect/components/widgets/TechnicienUniversHeatmap";
import type { TechUniversStats } from "@/shared/utils/technicienUniversEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Définition des univers avec couleurs (alignées sur enrichmentService.ts)
const UNIVERSES = [
  { slug: "pmr", label: "PMR", colorHex: "#2B15E0" },
  { slug: "volet_roulant", label: "Volets roulants", colorHex: "#9817F0" },
  { slug: "renovation", label: "Rénovation", colorHex: "#A38D77" },
  { slug: "electricite", label: "Électricité", colorHex: "#FD9A2C" },
  { slug: "plomberie", label: "Plomberie", colorHex: "#3BA6FF" },
  { slug: "serrurerie", label: "Serrurerie", colorHex: "#FF12BD" },
  { slug: "vitrerie", label: "Vitrerie", colorHex: "#7FFE2E" },
  { slug: "menuiserie", label: "Menuiserie", colorHex: "#FF7018" },
  // RÈGLE STRICTE: chauffage et climatisation N'EXISTENT PAS dans l'API Apogée
];

export default function FranchiseurStats() {
  const [techMode, setTechMode] = useState<"ca" | "heures" | "caParHeure">("ca");
  
  // Hook StatIA pour les données
  const { data, isLoading, error, agenciesToLoad } = useFranchiseurStatsStatia();

  if (isLoading && !data.agenciesLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Adapter les stats technicien pour le composant - TOP 5 uniquement
  const adaptedTechStats: TechUniversStats[] = (data?.technicienStats || [])
    .slice(0, 5); // TOP 5 techniciens par CA

  return (
    <div className="space-y-6">
      {/* Sélecteur de période */}
      <div className="flex justify-end">
        <NetworkPeriodSelector />
      </div>

      {/* Info agences */}
      {data.agenciesTotal > 0 && (
        <div className="rounded-xl border border-helpconfort-blue/15 p-4
          bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
          shadow-sm border-l-4 border-l-helpconfort-blue">
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
        </div>
      )}

      {error && (
        <Card className="border-destructive">
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
      <div className="rounded-xl border border-helpconfort-blue/15 p-6
        bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white dark:via-background dark:to-background
        shadow-sm border-l-4 border-l-helpconfort-blue">
        <div className="mb-4">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            TOP 5 Collaborateurs du Réseau
          </h3>
          <p className="text-sm text-muted-foreground">
            Meilleurs collaborateurs par CA, heures et performance sur l'ensemble du réseau
          </p>
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : adaptedTechStats.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <Tabs value={techMode} onValueChange={(v) => setTechMode(v as any)} className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="ca">CA HT</TabsTrigger>
                <TabsTrigger value="heures">Heures</TabsTrigger>
                <TabsTrigger value="caParHeure">CA/Heure</TabsTrigger>
              </TabsList>

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
        </div>
      </div>
    </div>
  );
}
