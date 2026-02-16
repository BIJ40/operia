/**
 * ProspectPoolPage - Exploration et sélection de prospects depuis le pool importé
 * Import Excel, filtrage, sélection, création de fiches
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Upload, CheckSquare, Plus, X, Filter, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProspectPool, useImportProspects, type ProspectPoolItem } from '../hooks/useProspectPool';
import { useCreateProspectCards } from '../hooks/useProspectCards';
import { parseProspectExcel } from '../utils/parseProspectExcel';
import { toast } from 'sonner';

export function ProspectPoolPage() {
  const [search, setSearch] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: prospects = [], isLoading } = useProspectPool({
    search: search || undefined,
    codePostal: codePostal || undefined,
  });

  const importMutation = useImportProspects();
  const createCardsMutation = useCreateProspectCards();

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    setImporting(true);
    try {
      const rows = await parseProspectExcel(file);
      await importMutation.mutateAsync(rows);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [importMutation]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  }, [prospects, selectedIds.size]);

  const handleCreateCards = useCallback(async () => {
    const selected = prospects.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    await createCardsMutation.mutateAsync(selected);
    setSelectedIds(new Set());
  }, [prospects, selectedIds, createCardsMutation]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setCodePostal('');
  }, []);

  const hasFilters = search || codePostal;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pool de prospects</h2>
          <p className="text-sm text-muted-foreground">
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} dans le pool
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="w-4 h-4 mr-1" />
            {importing ? 'Import en cours...' : 'Importer Excel'}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleCreateCards}
              disabled={createCardsMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer {selectedIds.size} fiche{selectedIds.size > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, enseigne, représentant, adresse..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative w-full sm:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Code postal"
                value={codePostal}
                onChange={e => setCodePostal(e.target.value)}
                className="pl-9"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Effacer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!isLoading && prospects.length === 0 && !hasFilters && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun prospect importé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Importez un fichier Excel contenant vos prospects potentiels pour commencer.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Importer un fichier Excel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {prospects.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === prospects.length && prospects.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Dénomination</TableHead>
                    <TableHead>Enseigne</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>CP</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Représentant</TableHead>
                    <TableHead>Effectif</TableHead>
                    <TableHead>CA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.map(p => (
                    <TableRow
                      key={p.id}
                      className={selectedIds.has(p.id) ? 'bg-primary/5' : 'cursor-pointer'}
                      onClick={() => toggleSelect(p.id)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleSelect(p.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {p.denomination || '—'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                        {p.enseigne || '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {p.adresse || '—'}
                      </TableCell>
                      <TableCell>
                        {p.code_postal && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {p.code_postal}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{p.telephone || '—'}</TableCell>
                      <TableCell className="text-sm">{p.representant || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.tranche_effectif || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {p.chiffre_affaire ? `${Number(p.chiffre_affaire).toLocaleString('fr-FR')} €` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 z-50">
          <CheckSquare className="w-5 h-5" />
          <span className="font-medium">{selectedIds.size} prospect{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateCards}
            disabled={createCardsMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer les fiches
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:text-primary-foreground/80"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
