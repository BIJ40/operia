import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/apogee-connect/utils/formatters";

interface UniversApporteurMatrixProps {
  data: Record<string, Record<string, { ca: number; nbDossiers: number }>>;
  universes: Array<{ slug: string; label: string; colorHex: string }>;
  loading?: boolean;
}

const formatApporteurType = (type: string): string => {
  const labels: Record<string, string> = {
    'assurance': 'Assurance',
    'gestion_locative': 'Gestion locative',
    'agence_immo': 'Gestion locative',
    'facility_services': 'Maintenanceur',
    'maintenanceur': 'Maintenanceur',
    'gestion_syndic': 'Syndic',
    'syndic': 'Syndic',
    'association': 'Association',
    'entreprise': 'Professionnel',
    'professionnel': 'Professionnel',
    'particulier': 'Clients directs',
    'bailleur_social': 'Bailleur Social',
  };
  return labels[type.toLowerCase()] || type;
};

export const UniversApporteurMatrix = ({
  data,
  universes,
  loading,
}: UniversApporteurMatrixProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Performance univers × apporteur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extraire tous les types d'apporteurs uniques
  const apporteurTypes = new Set<string>();
  Object.values(data).forEach((universData) => {
    Object.keys(universData).forEach((type) => apporteurTypes.add(type));
  });

  const sortedTypes = Array.from(apporteurTypes).sort();

  // Filtrer les univers qui ont des données
  const universesWithData = universes.filter((u) => data[u.slug]);

  if (universesWithData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
            Performance univers × apporteur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer les totaux
  const calculateTotal = (univers: string): { ca: number; dossiers: number } => {
    const universData = data[univers] || {};
    let totalCA = 0;
    let totalDossiers = 0;
    Object.values(universData).forEach((val) => {
      totalCA += val.ca;
      totalDossiers += val.nbDossiers;
    });
    return { ca: totalCA, dossiers: totalDossiers };
  };

  const calculateTypeTotal = (type: string): { ca: number; dossiers: number } => {
    let totalCA = 0;
    let totalDossiers = 0;
    Object.values(data).forEach((universData) => {
      if (universData[type]) {
        totalCA += universData[type].ca;
        totalDossiers += universData[type].nbDossiers;
      }
    });
    return { ca: totalCA, dossiers: totalDossiers };
  };

  const getIntensity = (ca: number, maxCA: number): number => {
    if (maxCA === 0) return 0;
    return ca / maxCA;
  };

  // Trouver le CA max pour la colorisation
  let maxCA = 0;
  Object.values(data).forEach((universData) => {
    Object.values(universData).forEach((val) => {
      if (val.ca > maxCA) maxCA = val.ca;
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Performance univers × apporteur
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          CA et nombre de dossiers par univers et type d'apporteur
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-max">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border border-border p-3 text-left font-semibold">
                  Univers
                </th>
                {sortedTypes.map((type) => (
                  <th
                    key={type}
                    className="border border-border p-3 text-center font-semibold min-w-[120px]"
                  >
                    {formatApporteurType(type)}
                  </th>
                ))}
                <th className="border border-border p-3 text-center font-semibold bg-muted">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {universesWithData.map((univers) => {
                const total = calculateTotal(univers.slug);
                return (
                  <tr key={univers.slug} className="hover:bg-muted/50">
                    <td
                      className="sticky left-0 z-10 bg-background border border-border p-3 font-medium"
                      style={{ color: univers.colorHex }}
                    >
                      {univers.label}
                    </td>
                    {sortedTypes.map((type) => {
                      const cellData = data[univers.slug]?.[type];
                      if (!cellData || cellData.ca === 0) {
                        return (
                          <td
                            key={type}
                            className="border border-border p-3 text-center text-muted-foreground"
                          >
                            -
                          </td>
                        );
                      }

                      const intensity = getIntensity(cellData.ca, maxCA);
                      const bgColor = `${univers.colorHex}${Math.round(intensity * 180 + 40).toString(16).padStart(2, '0')}`;

                      return (
                        <td
                          key={type}
                          className="border border-border p-3 text-center"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="space-y-1">
                            <div className="font-semibold">
                              {formatEuros(cellData.ca)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cellData.nbDossiers} dossier{cellData.nbDossiers > 1 ? 's' : ''}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-border p-3 text-center font-semibold bg-muted/30">
                      <div className="space-y-1">
                        <div>{formatEuros(total.ca)}</div>
                        <div className="text-xs text-muted-foreground">
                          {total.dossiers} dossier{total.dossiers > 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {/* Ligne totaux */}
              <tr className="bg-muted font-semibold">
                <td className="sticky left-0 z-10 bg-muted border border-border p-3">
                  Total
                </td>
                {sortedTypes.map((type) => {
                  const total = calculateTypeTotal(type);
                  return (
                    <td key={type} className="border border-border p-3 text-center">
                      <div className="space-y-1">
                        <div>{formatEuros(total.ca)}</div>
                        <div className="text-xs">
                          {total.dossiers} dossier{total.dossiers > 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td className="border border-border p-3 text-center">
                  <div className="space-y-1">
                    <div>
                      {formatEuros(
                        sortedTypes.reduce(
                          (sum, type) => sum + calculateTypeTotal(type).ca,
                          0
                        )
                      )}
                    </div>
                    <div className="text-xs">
                      {sortedTypes.reduce(
                        (sum, type) => sum + calculateTypeTotal(type).dossiers,
                        0
                      )}{' '}
                      dossiers
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
