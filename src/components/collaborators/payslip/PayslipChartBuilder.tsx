/**
 * Générateur de graphiques pour les données de bulletins de paie
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PAYSLIP_METRICS, DETAILED_METRICS, PayslipMetric } from './PayslipMetricSelector';
import { PayslipData, LigneRemunerationVariable } from '@/types/payslipData';
import { TrendingUp, BarChart3, X } from 'lucide-react';

type ChartType = 'line' | 'bar';

interface PayslipChartBuilderProps {
  payslips: PayslipData[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function PayslipChartBuilder({ payslips }: PayslipChartBuilderProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['taux_horaire_brut']);

  const allMetrics = [...PAYSLIP_METRICS, ...DETAILED_METRICS];

  // Extraire les valeurs des primes depuis raw_data
  const extractPrimeValue = (payslip: PayslipData, primeCategory: string): number => {
    if (!payslip.raw_data?.lignes_remuneration_variables) return 0;

    const primeMap: Record<string, string[]> = {
      'prime_panier_repas': ['prime_panier_repas'],
      'prime_deplacement': ['deplacement'],
      'prime_anciennete': ['prime_anciennete'],
      'prime_exceptionnelle': ['prime_exceptionnelle'],
      'primes_total': ['prime_panier_repas', 'prime_exceptionnelle', 'prime_anciennete', 'prime_performance', 'prime_vacances', 'prime_outillage', 'prime_transport', 'prime_salissure'],
    };

    const categories = primeMap[primeCategory] || [];
    return payslip.raw_data.lignes_remuneration_variables
      .filter((l: LigneRemunerationVariable) => categories.includes(l.categorie_interne))
      .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.montant || 0), 0);
  };

  // Extraire les heures sup
  const extractHeuresSup = (payslip: PayslipData, type: string): number => {
    if (!payslip.raw_data?.lignes_remuneration_variables) return 0;

    if (type === 'heures_supp_125') {
      return payslip.raw_data.lignes_remuneration_variables
        .filter((l: LigneRemunerationVariable) => l.categorie_interne === 'heures_supp_125')
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.nombre || 0), 0);
    }
    if (type === 'heures_supp_150') {
      return payslip.raw_data.lignes_remuneration_variables
        .filter((l: LigneRemunerationVariable) => l.categorie_interne === 'heures_supp_150')
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.nombre || 0), 0);
    }
    if (type === 'heures_supp_total') {
      return payslip.raw_data.lignes_remuneration_variables
        .filter((l: LigneRemunerationVariable) => ['heures_supp_125', 'heures_supp_150'].includes(l.categorie_interne))
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.nombre || 0), 0);
    }
    if (type === 'montant_heures_supp') {
      return payslip.raw_data.lignes_remuneration_variables
        .filter((l: LigneRemunerationVariable) => ['heures_supp_125', 'heures_supp_150'].includes(l.categorie_interne))
        .reduce((sum: number, l: LigneRemunerationVariable) => sum + (l.montant || 0), 0);
    }
    return 0;
  };

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    if (payslips.length === 0) return [];

    return payslips
      .sort((a, b) => {
        if (a.periode_annee !== b.periode_annee) return (a.periode_annee || 0) - (b.periode_annee || 0);
        return (a.periode_mois || 0) - (b.periode_mois || 0);
      })
      .map(p => {
        const dataPoint: Record<string, any> = {
          periode: `${String(p.periode_mois).padStart(2, '0')}/${p.periode_annee}`,
        };

        selectedMetrics.forEach(metricId => {
          // Métriques directes depuis payslip_data
          if (metricId in p && (p as any)[metricId] != null) {
            dataPoint[metricId] = (p as any)[metricId];
          }
          // Métriques calculées
          else if (metricId.startsWith('prime_') || metricId === 'primes_total') {
            dataPoint[metricId] = extractPrimeValue(p, metricId);
          }
          else if (metricId.startsWith('heures_supp') || metricId === 'montant_heures_supp') {
            dataPoint[metricId] = extractHeuresSup(p, metricId);
          }
        });

        return dataPoint;
      });
  }, [payslips, selectedMetrics]);

  const addMetric = (metricId: string) => {
    if (!selectedMetrics.includes(metricId) && selectedMetrics.length < 5) {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };

  const removeMetric = (metricId: string) => {
    setSelectedMetrics(selectedMetrics.filter(id => id !== metricId));
  };

  const getMetricLabel = (id: string) => {
    return allMetrics.find(m => m.id === id)?.label || id;
  };

  const formatTooltipValue = (value: number, metricId: string) => {
    const metric = allMetrics.find(m => m.id === metricId);
    if (!metric) return value;

    switch (metric.format) {
      case 'currency':
        return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
      case 'hours':
        return `${value} h`;
      case 'percent':
        return `${value} %`;
      default:
        return value;
    }
  };

  if (payslips.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune donnée de bulletin disponible pour créer des graphiques.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-helpconfort-blue" />
          Graphiques personnalisés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contrôles */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-sm">Type de graphique</Label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={chartType === 'line' ? 'default' : 'outline'}
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Courbe
              </Button>
              <Button
                size="sm"
                variant={chartType === 'bar' ? 'default' : 'outline'}
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Barres
              </Button>
            </div>
          </div>

          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-sm">Ajouter une métrique ({selectedMetrics.length}/5)</Label>
            <Select onValueChange={addMetric} value="">
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner une métrique..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {allMetrics
                  .filter(m => !selectedMetrics.includes(m.id))
                  .map(metric => (
                    <SelectItem key={metric.id} value={metric.id}>
                      <span className="text-xs text-muted-foreground mr-2">[{metric.category}]</span>
                      {metric.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Métriques sélectionnées */}
        {selectedMetrics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMetrics.map((metricId, idx) => (
              <Badge
                key={metricId}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                style={{ borderLeftColor: CHART_COLORS[idx % CHART_COLORS.length], borderLeftWidth: 3 }}
              >
                {getMetricLabel(metricId)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => removeMetric(metricId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Graphique */}
        {selectedMetrics.length > 0 && chartData.length > 0 && (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="periode" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatTooltipValue(value, name),
                      getMetricLabel(name),
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend formatter={(value) => getMetricLabel(value)} />
                  {selectedMetrics.map((metricId, idx) => (
                    <Line
                      key={metricId}
                      type="monotone"
                      dataKey={metricId}
                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="periode" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatTooltipValue(value, name),
                      getMetricLabel(name),
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend formatter={(value) => getMetricLabel(value)} />
                  {selectedMetrics.map((metricId, idx) => (
                    <Bar
                      key={metricId}
                      dataKey={metricId}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {selectedMetrics.length === 0 && (
          <div className="h-[200px] flex items-center justify-center border border-dashed rounded-lg text-muted-foreground">
            Sélectionnez au moins une métrique pour afficher un graphique
          </div>
        )}
      </CardContent>
    </Card>
  );
}
