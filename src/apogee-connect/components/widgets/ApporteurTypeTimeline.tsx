import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { formatApporteurType } from "@/apogee-connect/utils/formatters";

interface ApporteurTypeTimelineProps {
  projects: any[];
  clients: any[];
}

/**
 * Normalisation date → clé de mois (YY-MM)
 */
function monthKey(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear().toString().slice(-2); // 2 derniers chiffres
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Récupération du type d'apporteur pour un projet donné
 */
function getApporteurType(project: any, clientsById: Record<number, any>): string {
  // Si pas de commanditaireId, c'est un particulier
  const commanditaireId = project.data?.commanditaireId || project.commanditaireId;
  if (!commanditaireId) return "Particulier";

  // Chercher le client apporteur
  const apporteur = clientsById[commanditaireId];
  if (!apporteur) return "Particulier";

  // Récupérer le type
  const type = apporteur.data?.type || "Non défini";
  
  // Exclure les particuliers
  if (type.toLowerCase() === "particulier") return "Particulier";
  
  return type;
}

/**
 * Transformation en structure exploitable par Recharts
 */
function buildChartData(projects: any[], clients: any[]) {
  const clientsById: Record<number, any> = {};
  for (const c of clients) {
    if (c.id != null) {
      clientsById[c.id] = c;
    }
  }

  // timeline[type][month] = count
  const timeline: Record<string, Record<string, number>> = {};

  for (const p of projects) {
    const mk = monthKey(p.created_at || p.createdAt);
    if (!mk) continue;

    const type = getApporteurType(p, clientsById);
    if (!timeline[type]) timeline[type] = {};
    if (!timeline[type][mk]) timeline[type][mk] = 0;
    timeline[type][mk] += 1;
  }

  // Toutes les périodes (mois)
  const allMonths = Array.from(
    new Set(
      Object.values(timeline).flatMap((byMonth) => Object.keys(byMonth))
    )
  ).sort();

  const allTypes = Object.keys(timeline).sort();

  const chartData = allMonths.map((month) => {
    const row: Record<string, any> = { date: month };
    for (const type of allTypes) {
      // Utiliser le type formaté comme clé
      const formattedType = formatApporteurType(type);
      row[formattedType] = timeline[type][month] ?? 0;
    }
    return row;
  });

  return { chartData, allTypes: allTypes.map(formatApporteurType) };
}

const COLORS = [
  "hsl(var(--primary))",       // Bleu Help Confort
  "hsl(var(--accent))",         // Orange Help Confort
  "hsl(271, 91%, 65%)",         // Violet
  "hsl(142, 71%, 45%)",         // Vert
  "hsl(340, 82%, 52%)",         // Rose/Rouge
  "hsl(45, 93%, 47%)",          // Jaune/Or
  "hsl(180, 77%, 44%)",         // Cyan
  "hsl(16, 90%, 55%)",          // Orange corail
];

export const ApporteurTypeTimeline = ({ projects, clients }: ApporteurTypeTimelineProps) => {
  const { chartData, allTypes } = useMemo(
    () => buildChartData(projects, clients),
    [projects, clients]
  );

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const handleLegendClick = (type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution des types d'apporteurs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune donnée disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Évolution des types d'apporteurs</CardTitle>
        <p className="text-xs text-muted-foreground">
          Nombre de dossiers créés par type, agrégé par mois
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              allowDecimals={false}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white',
                border: '2px solid hsl(var(--primary))',
                borderRadius: '8px',
                zIndex: 100
              }}
              wrapperStyle={{ zIndex: 100 }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }} 
              onClick={(e) => {
                if (e.dataKey) {
                  handleLegendClick(String(e.dataKey));
                }
              }}
              formatter={(value) => (
                <span style={{ 
                  opacity: hiddenTypes.has(String(value)) ? 0.4 : 1,
                  textDecoration: hiddenTypes.has(String(value)) ? 'line-through' : 'none'
                }}>
                  {value}
                </span>
              )}
            />
            {allTypes.map((type, index) => (
              <Line
                key={type}
                type="monotone"
                dataKey={type}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                hide={hiddenTypes.has(type)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
