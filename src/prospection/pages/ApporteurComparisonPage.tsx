/**
 * ApporteurComparisonPage - Comparateur multi-apporteurs
 * Sélection depuis la liste Apogée (commanditaires)
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Loader2, GitCompare, Search, Building2, RefreshCw } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { useProfile } from '@/contexts/ProfileContext';
import { useApporteurComparison } from '../hooks/useApporteurComparison';
import { useApogeeCommanditaires, type ApogeeCommanditaire } from '@/hooks/useApogeeCommanditaires';
import { ComparisonTable } from '../components/ComparisonTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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

interface SelectedApporteur {
  id: string;
  name: string;
}

export function ApporteurComparisonPage() {
  const { agencyId } = useProfile();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<PeriodKey>('6m');
  const [selected, setSelected] = useState<SelectedApporteur[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = useCallback(async () => {
    if (!agencyId) return;
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('compute-apporteur-metrics', {
        body: { agency_id: agencyId },
      });
      if (error) throw error;
      toast.success(`Métriques recalculées (${data?.data?.daily_rows ?? 0} lignes)`);
      queryClient.invalidateQueries({ queryKey: ['prospection-apporteur-comparison'] });
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setIsRecalculating(false);
    }
  }, [agencyId, queryClient]);

  const { from, to } = getPeriodDates(period);

  // Charger les commanditaires Apogée
  const { data: commanditaires = [], isLoading: loadingApogee } = useApogeeCommanditaires();

  const selectedIds = useMemo(() => selected.map(s => s.id), [selected]);

  // Load comparison data
  const { data: comparisonData, isLoading } = useApporteurComparison({
    agencyId,
    apporteurIds: selectedIds,
    dateFrom: from,
    dateTo: to,
    enabled: selectedIds.length >= 2,
  });

  // Filtrer les suggestions
  const suggestions = useMemo(() => {
    if (search.length < 1) return [];
    const q = search.toLowerCase();
    return commanditaires
      .filter(c => !selectedIds.includes(String(c.id)))
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        (c.ville && c.ville.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [commanditaires, search, selectedIds]);

  const addApporteur = (cmd: ApogeeCommanditaire) => {
    if (selected.length >= 5) return;
    setSelected(prev => [...prev, { id: String(cmd.id), name: cmd.name }]);
    setSearch('');
    setShowDropdown(false);
  };

  const removeApporteur = (id: string) => {
    setSelected(prev => prev.filter(x => x.id !== id));
  };

  // Résoudre le nom d'un apporteur
  const getLabel = (id: string) => {
    const s = selected.find(x => x.id === id);
    return s?.name || `#${id}`;
  };

  return (
    <div className="space-y-4">
      {/* Period */}
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

        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Calcul…' : 'Recalculer'}
        </Button>
      </div>

      {/* Sélection apporteurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="w-4 h-4" />
            Sélection ({selected.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Badges sélectionnés */}
          <div className="flex flex-wrap gap-2">
            {selected.map(s => (
              <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                {s.name}
                <span className="text-[10px] text-muted-foreground ml-1">#{s.id}</span>
                <button onClick={() => removeApporteur(s.id)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Recherche Apogée */}
          {selected.length < 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un apporteur Apogée..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="pl-10"
              />

              {/* Dropdown suggestions */}
              {showDropdown && search.length >= 1 && (
                <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingApogee ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map(cmd => (
                      <button
                        key={cmd.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center gap-2 text-sm transition-colors"
                        onMouseDown={e => {
                          e.preventDefault();
                          addApporteur(cmd);
                        }}
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{cmd.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[cmd.type, cmd.ville].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">#{cmd.id}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">Aucun résultat</p>
                  )}
                </div>
              )}
            </div>
          )}

          {selected.length < 2 && (
            <p className="text-xs text-muted-foreground">Sélectionnez au moins 2 apporteurs pour comparer.</p>
          )}
        </CardContent>
      </Card>

      {/* Résultats comparaison */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {comparisonData && comparisonData.length >= 2 && (
        <ComparisonTable
          items={comparisonData.map(c => ({
            apporteur_id: c.apporteur_id,
            label: getLabel(c.apporteur_id),
            kpis: c.kpis,
          }))}
        />
      )}
    </div>
  );
}
