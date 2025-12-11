import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TechUniversStats } from "@/shared/utils/technicienUniversEngine";
import { formatEuros } from "@/apogee-connect/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TechnicienUniversHeatmapProps {
  data: TechUniversStats[];
  universes: Array<{ slug: string; label: string; colorHex: string }>;
  loading?: boolean;
  mode: "ca" | "heures" | "caParHeure";
  showInactive: boolean;
  onToggleInactive?: (show: boolean) => void;
  hideInactiveToggle?: boolean;
}

export const TechnicienUniversHeatmap = ({
  data,
  universes,
  loading,
  mode,
  showInactive,
  onToggleInactive,
  hideInactiveToggle = false,
}: TechnicienUniversHeatmapProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition par technicien et univers</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filtrer les techniciens selon l'état actif/inactif
  const filteredData = showInactive 
    ? data 
    : data.filter(tech => tech.technicienActif);

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition par technicien et univers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer les valeurs min/max pour la heatmap
  let maxValue = 0;
  filteredData.forEach((tech) => {
    universes.forEach((univers) => {
      const value =
        mode === "ca"
          ? tech.universes[univers.slug]?.caHT || 0
          : mode === "heures"
          ? tech.universes[univers.slug]?.heures || 0
          : tech.universes[univers.slug]?.caParHeure || 0;
      if (value > maxValue) maxValue = value;
    });
  });

  const getIntensity = (value: number): number => {
    if (maxValue === 0) return 0;
    return value / maxValue;
  };

  const formatValue = (value: number): string => {
    if (mode === "ca") return formatEuros(value);
    if (mode === "heures") return `${value.toFixed(1)}h`;
    return `${formatEuros(value)}/h`;
  };

  const getTitle = (): string => {
    if (mode === "ca") return "CA HT par technicien et univers";
    if (mode === "heures") return "Heures par technicien et univers";
    return "CA/heure par technicien et univers";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
              {getTitle()}
            </CardTitle>
            <CardDescription>
              Analyse croisée de la performance par technicien et domaine d'intervention
            </CardDescription>
          </div>
          {!hideInactiveToggle && onToggleInactive && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={onToggleInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-muted-foreground cursor-pointer">
                Afficher inactifs
              </Label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border bg-muted p-2 text-left sticky left-0 z-10 bg-background">
                  Technicien
                </th>
                {universes.map((univers) => (
                  <th
                    key={univers.slug}
                    className="border border-border bg-muted p-2 text-center min-w-[100px]"
                    style={{ color: univers.colorHex }}
                  >
                    {univers.label}
                  </th>
                ))}
                <th className="border border-border bg-muted p-2 text-center font-bold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((tech) => (
                <tr 
                  key={tech.technicienId} 
                  className="hover:bg-muted/50"
                  style={{ opacity: tech.technicienActif ? 1 : 0.6 }}
                >
                  <td className="border border-border p-2 font-medium sticky left-0 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tech.technicienColor }}
                      />
                      <div className="flex flex-col">
                        <span style={{ color: tech.technicienColor }}>
                          {tech.technicienNom}
                        </span>
                        {tech.agenceLabel && (
                          <span className="text-xs text-muted-foreground">
                            {tech.agenceLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {universes.map((univers) => {
                    const universeData = tech.universes[univers.slug];
                    const value =
                      mode === "ca"
                        ? universeData?.caHT || 0
                        : mode === "heures"
                        ? universeData?.heures || 0
                        : universeData?.caParHeure || 0;
                    const intensity = getIntensity(value);

                    return (
                      <td
                        key={univers.slug}
                        className="border border-border p-2 text-center text-sm"
                        style={{
                          backgroundColor: value > 0 
                            ? `${univers.colorHex}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`
                            : 'transparent',
                        }}
                      >
                        {value > 0 ? (
                          <div className="space-y-1">
                            <div className="font-semibold">{formatValue(value)}</div>
                        {universeData && (
                              <div className="text-xs text-muted-foreground">
                                {universeData.nbDossiers.toFixed(1)} dossier{universeData.nbDossiers > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-border p-2 text-center font-bold bg-muted/30">
                    <div className="space-y-1">
                      <div>{formatValue(mode === "ca" ? tech.totaux.caHT : mode === "heures" ? tech.totaux.heures : tech.totaux.caParHeure)}</div>
                      <div className="text-xs text-muted-foreground">
                        {tech.totaux.nbDossiers.toFixed(1)} dossier{tech.totaux.nbDossiers > 1 ? 's' : ''}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
