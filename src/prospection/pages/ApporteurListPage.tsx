/**
 * ApporteurListPage - Liste des apporteurs avec KPIs agrégés
 * Inclut recherche live depuis Apogée (commanditaires)
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, TrendingDown, Loader2, Building2, MapPin, Phone, Mail } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { useApporteurListMetrics } from '../hooks/useApporteurListMetrics';
import { useApogeeCommanditaires, type ApogeeCommanditaire } from '@/hooks/useApogeeCommanditaires';
import { format, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  onSelectApporteur: (id: string, name?: string) => void;
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Update dropdown position when showing suggestions
  useEffect(() => {
    if (showSuggestions && search.length >= 2 && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [showSuggestions, search]);

  const { from, to } = getPeriodDates(period);
  const { data: apporteurs = [], isLoading } = useApporteurListMetrics({
    agencyId,
    dateFrom: from,
    dateTo: to,
  });

  // Recherche Apogée commanditaires
  const { data: commanditaires = [], isLoading: loadingApogee } = useApogeeCommanditaires();

  // Suggestions filtrées depuis Apogée
  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return commanditaires
      .filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q))
      .slice(0, 8);
  }, [commanditaires, search]);

  // Index commanditaires par id pour résolution de noms
  const commanditairesById = useMemo(() => {
    const map = new Map<string, ApogeeCommanditaire>();
    for (const c of commanditaires) {
      map.set(String(c.id), c);
    }
    return map;
  }, [commanditaires]);

  const getApporteurName = useCallback((id: string) => {
    return commanditairesById.get(id)?.name || `Apporteur #${id}`;
  }, [commanditairesById]);

  // Apporteurs filtrés dans les métriques locales
  const filtered = useMemo(() => {
    if (!search) return apporteurs;
    const q = search.toLowerCase();
    return apporteurs.filter(a => {
      const name = getApporteurName(a.apporteur_id).toLowerCase();
      return name.includes(q) || a.apporteur_id.toLowerCase().includes(q);
    });
  }, [apporteurs, search, getApporteurName]);

  const handleSelectSuggestion = useCallback((cmd: ApogeeCommanditaire) => {
    setSearch(cmd.name);
    setShowSuggestions(false);
    onSelectApporteur(String(cmd.id), cmd.name);
  }, [onSelectApporteur]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 relative z-30">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Rechercher un apporteur (nom ou ID Apogée)..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-9"
          />

          {/* Suggestions dropdown via portal */}
          {showSuggestions && search.length >= 2 && dropdownPos && createPortal(
            <div
              className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl max-h-[400px] overflow-y-auto"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            >
              {loadingApogee ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche dans Apogée...
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border">
                    Apporteurs Apogée
                  </div>
                  {suggestions.map(cmd => (
                    <button
                      key={cmd.id}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors",
                        "border-b border-border/50 last:border-b-0"
                      )}
                      onMouseDown={() => handleSelectSuggestion(cmd)}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground truncate">{cmd.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              #{cmd.id}
                            </Badge>
                            {cmd.type && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                {cmd.type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                            {cmd.ville && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />{cmd.ville}
                              </span>
                            )}
                            {cmd.tel && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3" />{cmd.tel}
                              </span>
                            )}
                            {cmd.email && (
                              <span className="flex items-center gap-0.5">
                                <Mail className="w-3 h-3" />{cmd.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Aucun apporteur trouvé dans Apogée
                </div>
              )}
            </div>,
            document.body
          )}
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
              {apporteurs.length === 0
                ? 'Aucune donnée. Lancez le calcul des métriques.'
                : 'Aucun résultat pour cette recherche. Essayez via les suggestions Apogée ci-dessus.'}
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
                      onClick={() => onSelectApporteur(a.apporteur_id, getApporteurName(a.apporteur_id))}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getApporteurName(a.apporteur_id)}
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
