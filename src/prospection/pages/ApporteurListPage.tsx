/**
 * ApporteurListPage - Liste des apporteurs avec KPIs agrégés
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, TrendingDown, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApporteurListMetrics } from '../hooks/useApporteurListMetrics';
import { format, subDays, subMonths } from 'date-fns';

interface Props {
  onSelectApporteur: (id: string) => void;
}

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

export function ApporteurListPage({ onSelectApporteur }: Props) {
  const { agencyId } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>('90j');
  const [search, setSearch] = useState('');

  const { from, to } = getPeriodDates(period);
  const { data: apporteurs = [], isLoading } = useApporteurListMetrics({
    agencyId,
    dateFrom: from,
    dateTo: to,
  });

  const filtered = useMemo(() => {
    if (!search) return apporteurs;
    const q = search.toLowerCase();
    return apporteurs.filter(a => a.apporteur_id.toLowerCase().includes(q));
  }, [apporteurs, search]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un apporteur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {apporteurs.length === 0 ? 'Aucune donnée. Lancez le calcul des métriques.' : 'Aucun résultat pour cette recherche.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apporteur</TableHead>
                    <TableHead className="text-right">Dossiers</TableHead>
                    <TableHead className="text-right">CA HT</TableHead>
                    <TableHead className="text-right">Taux transfo</TableHead>
                    <TableHead className="text-right">Panier moy.</TableHead>
                    <TableHead className="text-right">Factures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow
                      key={a.apporteur_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectApporteur(a.apporteur_id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {a.apporteur_id}
                          {a.kpis.taux_transfo_devis != null && a.kpis.taux_transfo_devis < 30 && a.kpis.devis_total >= 5 && (
                            <Badge variant="destructive" className="text-[10px]">
                              <TrendingDown className="w-3 h-3 mr-0.5" />Alerte
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{a.kpis.dossiers_received}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(a.kpis.ca_ht)}€</TableCell>
                      <TableCell className="text-right">
                        {a.kpis.taux_transfo_devis != null ? `${a.kpis.taux_transfo_devis.toFixed(1)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.kpis.panier_moyen != null ? `${fmt(a.kpis.panier_moyen)}€` : '—'}
                      </TableCell>
                      <TableCell className="text-right">{a.kpis.factures}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
