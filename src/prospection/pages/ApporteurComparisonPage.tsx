/**
 * ApporteurComparisonPage - Comparateur multi-apporteurs
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, GitCompare } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useApporteurComparison } from '../hooks/useApporteurComparison';
import { useApporteurListMetrics } from '../hooks/useApporteurListMetrics';
import { ComparisonTable } from '../components/ComparisonTable';

type PeriodKey = '30j' | '90j' | '6m' | '12m';

function getPeriodDates(period: PeriodKey): { from: string; to: string } {
  const to = format(new Date(), 'yyyy-MM-dd');
  const map: Record<PeriodKey, Date> = {
    '30j': subDays(new Date(), 30),
    '90j': subDays(new Date(), 90),
    '6m': subMonths(new Date(), 6),
    '12m': subMonths(new Date(), 12),
  };
  return { from: format(map[period], 'yyyy-MM-dd'), to };
}

export function ApporteurComparisonPage() {
  const { agencyId } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('6m');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inputId, setInputId] = useState('');

  const { from, to } = getPeriodDates(period);

  // Load list for autocomplete
  const { data: allApporteurs = [] } = useApporteurListMetrics({
    agencyId,
    dateFrom: from,
    dateTo: to,
  });

  // Load comparison data
  const { data: comparisonData, isLoading } = useApporteurComparison({
    agencyId,
    apporteurIds: selectedIds,
    dateFrom: from,
    dateTo: to,
    enabled: selectedIds.length >= 2,
  });

  const addApporteur = (id: string) => {
    if (id && !selectedIds.includes(id) && selectedIds.length < 5) {
      setSelectedIds(prev => [...prev, id]);
      setInputId('');
    }
  };

  const removeApporteur = (id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const availableToAdd = allApporteurs
    .filter(a => !selectedIds.includes(a.apporteur_id))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      {/* Period + selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={v => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30j">30 jours</SelectItem>
            <SelectItem value="90j">90 jours</SelectItem>
            <SelectItem value="6m">6 mois</SelectItem>
            <SelectItem value="12m">12 mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selected apporteurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Sélection ({selectedIds.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {id}
                <button onClick={() => removeApporteur(id)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {selectedIds.length < 5 && (
            <div className="flex gap-2">
              <Select value={inputId} onValueChange={v => addApporteur(v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Ajouter un apporteur..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map(a => (
                    <SelectItem key={a.apporteur_id} value={a.apporteur_id}>
                      {a.apporteur_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedIds.length < 2 && (
            <p className="text-xs text-muted-foreground">Sélectionnez au moins 2 apporteurs pour comparer.</p>
          )}
        </CardContent>
      </Card>

      {/* Comparison results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {comparisonData && comparisonData.length >= 2 && (
        <ComparisonTable
          items={comparisonData.map(c => ({
            apporteur_id: c.apporteur_id,
            label: c.apporteur_id,
            kpis: c.kpis,
          }))}
        />
      )}
    </div>
  );
}
