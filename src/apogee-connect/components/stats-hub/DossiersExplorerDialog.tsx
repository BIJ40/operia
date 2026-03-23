/**
 * DossiersExplorerDialog - Explorateur complet de tous les dossiers
 * Filtrage multi-critères : état, univers, avec/sans devis, avec/sans heures
 */

import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { FolderOpen, Search, ArrowUpDown, X, Filter } from 'lucide-react';
import { ChargeTravauxProjet } from '@/statia/shared/chargeTravauxEngine';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const fmtCurrency = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k€`;
  return `${Math.round(v)}€`;
};

const ETAT_LABELS: Record<string, string> = {
  'to_planify_tvx': 'À planifier TVX',
  'devis_to_order': 'À commander',
  'wait_fourn': 'Att. fournitures',
};

const ETAT_COLORS: Record<string, string> = {
  'to_planify_tvx': 'hsl(200, 85%, 60%)',
  'devis_to_order': 'hsl(35, 90%, 60%)',
  'wait_fourn': 'hsl(270, 60%, 65%)',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projets: ChargeTravauxProjet[];
  clients?: any[];
}

type SortKey = 'reference' | 'client' | 'heures' | 'devis' | 'univers' | 'etat' | 'age' | 'risk';
type SortDir = 'asc' | 'desc';

export function DossiersExplorerDialog({ open, onOpenChange, projets, clients }: Props) {
  const [search, setSearch] = useState('');
  const [filterEtat, setFilterEtat] = useState<string>('all');
  const [filterUnivers, setFilterUnivers] = useState<string>('all');
  const [filterDevis, setFilterDevis] = useState<string>('all');
  const [filterHeures, setFilterHeures] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('devis');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Client lookup
  const clientMap = useMemo(() => {
    const m = new Map<number | string, string>();
    if (!clients) return m;
    for (const c of clients) {
      if (c?.id != null) {
        const name = c.nom || c.name || c.raisonSociale || c.raison_sociale || `Client ${c.id}`;
        m.set(c.id, name);
        m.set(String(c.id), name);
        m.set(Number(c.id), name);
      }
    }
    return m;
  }, [clients]);

  const getClientName = useCallback((p: ChargeTravauxProjet): string => {
    const label = p.label || '';
    if (label && label !== String(p.projectId)) return label;
    return clientMap.get(p.projectId) || `Dossier ${p.reference || p.projectId}`;
  }, [clientMap]);

  // Available univers
  const availableUnivers = useMemo(() => {
    const set = new Set<string>();
    for (const p of projets) {
      set.add(p.universes[0] || 'Non classé');
    }
    return Array.from(set).sort();
  }, [projets]);

  // Available etats
  const availableEtats = useMemo(() => {
    const set = new Set<string>();
    for (const p of projets) set.add(p.etatWorkflow);
    return Array.from(set);
  }, [projets]);

  // Filtered + sorted
  const filteredProjets = useMemo(() => {
    let list = projets;

    if (filterEtat !== 'all') list = list.filter(p => p.etatWorkflow === filterEtat);
    if (filterUnivers !== 'all') list = list.filter(p => (p.universes[0] || 'Non classé') === filterUnivers);
    if (filterDevis === 'with') list = list.filter(p => p.devisHT > 0);
    if (filterDevis === 'without') list = list.filter(p => p.devisHT === 0);
    if (filterHeures === 'with') list = list.filter(p => p.totalHeuresTech > 0);
    if (filterHeures === 'without') list = list.filter(p => p.totalHeuresTech === 0);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        String(p.reference || '').toLowerCase().includes(q) ||
        String(p.projectId).includes(q) ||
        getClientName(p).toLowerCase().includes(q) ||
        (p.universes[0] || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'reference': return dir * String(a.reference || '').localeCompare(String(b.reference || ''));
        case 'client': return dir * getClientName(a).localeCompare(getClientName(b));
        case 'heures': return dir * (a.totalHeuresTech - b.totalHeuresTech);
        case 'devis': return dir * (a.devisHT - b.devisHT);
        case 'univers': return dir * (a.universes[0] || '').localeCompare(b.universes[0] || '');
        case 'etat': return dir * a.etatWorkflowLabel.localeCompare(b.etatWorkflowLabel);
        case 'age': return dir * ((a.ageDays || 0) - (b.ageDays || 0));
        case 'risk': return dir * (a.riskScoreGlobal - b.riskScoreGlobal);
        default: return 0;
      }
    });
  }, [projets, filterEtat, filterUnivers, filterDevis, filterHeures, search, sortKey, sortDir, getClientName]);

  const totalCA = filteredProjets.reduce((s, p) => s + p.devisHT, 0);
  const totalH = filteredProjets.reduce((s, p) => s + p.totalHeuresTech, 0);

  const hasFilters = filterEtat !== 'all' || filterUnivers !== 'all' || filterDevis !== 'all' || filterHeures !== 'all' || search.trim() !== '';

  const clearFilters = () => {
    setSearch('');
    setFilterEtat('all');
    setFilterUnivers('all');
    setFilterDevis('all');
    setFilterHeures('all');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, sortKeyVal, className }: { label: string; sortKeyVal: SortKey; className?: string }) => (
    <button className={`flex items-center gap-1 hover:text-foreground transition-colors ${className || ''}`} onClick={() => toggleSort(sortKeyVal)}>
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyVal ? 'text-foreground' : 'text-muted-foreground/50'}`} />
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Explorateur Dossiers
            <Badge variant="secondary">{filteredProjets.length} / {projets.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-3">
          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par réf, client, univers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={filterEtat} onValueChange={setFilterEtat}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="État" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>
                {availableEtats.map(e => (
                  <SelectItem key={e} value={e}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ETAT_COLORS[e] || '#6b7280' }} />
                      {ETAT_LABELS[e] || e}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUnivers} onValueChange={setFilterUnivers}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Univers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous univers</SelectItem>
                {availableUnivers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDevis} onValueChange={setFilterDevis}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Devis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Devis : tous</SelectItem>
                <SelectItem value="with">Avec devis</SelectItem>
                <SelectItem value="without">Sans devis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterHeures} onValueChange={setFilterHeures}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Heures" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Heures : tous</SelectItem>
                <SelectItem value="with">Avec heures</SelectItem>
                <SelectItem value="without">Sans heures</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={clearFilters}>
                <X className="h-3 w-3" /> Réinitialiser
              </Button>
            )}
          </div>

          {/* Summary bar */}
          <div className="flex gap-4 text-sm">
            <span><strong>{filteredProjets.length}</strong> dossiers</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-green-600 font-medium">{fmtCurrency(totalCA)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-orange-500 font-medium">{Math.round(totalH)}h homme</span>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader label="Client" sortKeyVal="client" /></TableHead>
                  <TableHead><SortHeader label="Réf." sortKeyVal="reference" /></TableHead>
                  <TableHead><SortHeader label="État" sortKeyVal="etat" /></TableHead>
                  <TableHead><SortHeader label="Univers" sortKeyVal="univers" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="H. Tech" sortKeyVal="heures" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="CA HT" sortKeyVal="devis" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Âge" sortKeyVal="age" /></TableHead>
                  <TableHead className="text-right"><SortHeader label="Risque" sortKeyVal="risk" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjets.map(p => (
                  <TableRow key={p.projectId}>
                    <TableCell>
                      <div className="font-medium text-sm">{getClientName(p)}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{p.reference || p.projectId}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{ borderColor: ETAT_COLORS[p.etatWorkflow], color: ETAT_COLORS[p.etatWorkflow] }}>
                        {p.etatWorkflowLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.universes[0] || 'N/C'}</TableCell>
                    <TableCell className="text-right text-sm">{p.totalHeuresTech > 0 ? `${Math.round(p.totalHeuresTech)}h` : '-'}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{p.devisHT > 0 ? fmtCurrency(p.devisHT) : '-'}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{p.ageDays != null ? `${p.ageDays}j` : '-'}</TableCell>
                    <TableCell className="text-right">
                      {p.riskScoreGlobal > 0.6 ? (
                        <Badge variant="destructive" className="text-xs">{Math.round(p.riskScoreGlobal * 100)}%</Badge>
                      ) : p.riskScoreGlobal > 0.3 ? (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">{Math.round(p.riskScoreGlobal * 100)}%</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{Math.round(p.riskScoreGlobal * 100)}%</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProjets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Aucun dossier ne correspond aux filtres
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
