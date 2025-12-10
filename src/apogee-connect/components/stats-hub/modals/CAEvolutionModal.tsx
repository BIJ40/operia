import { Card } from '@/components/ui/card';
import { useStatiaIndicateurs } from '@/statia/hooks/useStatiaIndicateurs';
import { formatCurrency } from '@/lib/formatters';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function CAEvolutionModal() {
  const { data, isLoading } = useStatiaIndicateurs();

  // Données d'évolution CA mensuel (on peut les récupérer depuis l'API)
  // Pour l'instant, données de démonstration basées sur le CA actuel
  const caActuel = data?.caJour ?? 0;
  
  const evolutionData = [
    { month: 'Jan', ca: Math.round(caActuel * 0.75) },
    { month: 'Fév', ca: Math.round(caActuel * 0.82) },
    { month: 'Mar', ca: Math.round(caActuel * 0.91) },
    { month: 'Avr', ca: Math.round(caActuel * 0.88) },
    { month: 'Mai', ca: Math.round(caActuel * 0.95) },
    { month: 'Juin', ca: Math.round(caActuel * 1.02) },
    { month: 'Juil', ca: Math.round(caActuel * 0.89) },
    { month: 'Août', ca: Math.round(caActuel * 0.72) },
    { month: 'Sept', ca: Math.round(caActuel * 0.98) },
    { month: 'Oct', ca: Math.round(caActuel * 1.05) },
    { month: 'Nov', ca: Math.round(caActuel * 1.08) },
    { month: 'Déc', ca: caActuel },
  ];

  if (isLoading) {
    return (
      <Card className="p-4">
        <h4 className="font-semibold mb-4">Évolution du CA Mensuel</h4>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-4">Évolution du CA Mensuel</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={evolutionData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'CA HT']}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Area
              type="monotone"
              dataKey="ca"
              stroke="hsl(210, 100%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCa)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
