/**
 * ApporteurDossiers - Liste complète des dossiers de l'apporteur
 */

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Select removed - using buttons for status filter
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  useApporteurDossiers, 
  DossierRow, 
  STATUS_CONFIG, 
  formatCurrency, 
  formatDate 
} from '../hooks/useApporteurDossiers';
import { 
  FolderOpen, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  FileText,
  Receipt,
  Euro,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import DossierDocumentsPanel from '../components/DossierDocumentsPanel';

type SortField = 'ref' | 'clientName' | 'status' | 'dateCreation' | 'factureHT' | 'restedu';
type SortDirection = 'asc' | 'desc';

export default function ApporteurDossiers() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data, isLoading, error, isFetching } = useApporteurDossiers();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dateCreation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDossier, setSelectedDossier] = useState<DossierRow | null>(null);

  // Init status filter from URL params
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  const dossiers = data?.data?.dossiers || [];
  const totals = data?.data?.totals || { count: 0, resteDu: 0 };

  // Get unique statuses for filter
  const statuses = useMemo(() => {
    const unique = new Set(dossiers.map(d => d.status));
    return Array.from(unique).map(s => ({
      value: s,
      label: dossiers.find(d => d.status === s)?.statusLabel || s,
    }));
  }, [dossiers]);

  // Filter and sort
  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(d =>
        d.ref.toLowerCase().includes(searchLower) ||
        d.clientName.toLowerCase().includes(searchLower) ||
        d.city.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'ref':
          comparison = a.ref.localeCompare(b.ref);
          break;
        case 'clientName':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'status':
          comparison = a.statusLabel.localeCompare(b.statusLabel);
          break;
        case 'dateCreation':
          comparison = (a.dateCreation || '').localeCompare(b.dateCreation || '');
          break;
        case 'factureHT':
          comparison = a.factureHT - b.factureHT;
          break;
        case 'restedu':
          comparison = a.restedu - b.restedu;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [dossiers, search, statusFilter, sortField, sortDirection]);

  // Calculate totals for filtered
  const filteredTotals = useMemo(() => ({
    count: filteredDossiers.length,
    resteDu: filteredDossiers.reduce((sum, d) => sum + d.restedu, 0),
    factureHT: filteredDossiers.reduce((sum, d) => sum + d.factureHT, 0),
  }), [filteredDossiers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['apporteur-dossiers'] });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" />
              Mes dossiers
            </h1>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || data?.error === 'non_raccorde') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Mes dossiers
          </h1>
        </div>
        <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))]">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--ap-warning))]" />
              <p className="text-foreground">
                {data?.error === 'non_raccorde' 
                  ? 'Compte non raccordé à Apogée. Contactez l\'agence pour activer.'
                  : 'Erreur de chargement des dossiers.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Mes dossiers
          </h1>
          <p className="text-muted-foreground">
            {totals.count} dossier(s) au total
          </p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          Tous ({dossiers.length})
        </Button>
        {statuses.map(s => {
          const count = dossiers.filter(d => d.status === s.value).length;
          const conf = STATUS_CONFIG[s.value] || STATUS_CONFIG.en_cours;
          return (
            <Button
              key={s.value}
              variant={statusFilter === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s.value)}
              className={statusFilter !== s.value ? cn(conf.bgColor, conf.color, 'border') : ''}
            >
              {s.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('ref')}
                  >
                    <div className="flex items-center">
                      Réf <SortIcon field="ref" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('clientName')}
                  >
                    <div className="flex items-center">
                      Client <SortIcon field="clientName" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      État <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">1er RDV</TableHead>
                  <TableHead className="hidden lg:table-cell">Devis</TableHead>
                  <TableHead className="hidden md:table-cell">Facturé</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('factureHT')}
                  >
                    <div className="flex items-center justify-end">
                      Montant <SortIcon field="factureHT" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('restedu')}
                  >
                    <div className="flex items-center justify-end">
                      Reste dû <SortIcon field="restedu" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun dossier trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDossiers.map((d) => {
                    const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.en_cours;
                    return (
                      <TableRow 
                        key={d.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedDossier(d)}
                      >
                        <TableCell className="font-medium">{d.ref}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{d.clientName}</div>
                            <div className="text-xs text-muted-foreground">{d.city}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', statusConf.bgColor, statusConf.color)}>
                            {d.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {formatDate(d.datePremierRdv)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {d.devisId ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              {formatDate(d.dateDevisValide || d.dateDevisEnvoye)}
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {d.factureId ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              {formatDate(d.dateFacture)}
                            </Button>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {d.factureHT > 0 ? formatCurrency(d.factureHT) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {d.restedu > 0 ? formatCurrency(d.restedu) : d.factureHT > 0 ? '✓' : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals footer */}
          <div className="border-t bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {filteredTotals.count} dossier(s)
              </span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Euro className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Facturé:</span>
                <span className="font-semibold">{formatCurrency(filteredTotals.factureHT)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Reste dû:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(filteredTotals.resteDu)}
                  {formatCurrency(filteredTotals.resteDu)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dossier Detail Dialog */}
      <Dialog open={!!selectedDossier} onOpenChange={() => setSelectedDossier(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Dossier — {selectedDossier?.clientName}
            </DialogTitle>
          </DialogHeader>
          {selectedDossier && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedDossier.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ville</p>
                  <p className="font-medium">{selectedDossier.city || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">État</p>
                <Badge className={cn(
                  STATUS_CONFIG[selectedDossier.status]?.bgColor,
                  STATUS_CONFIG[selectedDossier.status]?.color
                )}>
                  {selectedDossier.statusLabel}
                </Badge>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Jalons</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Création:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateCreation)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">1er RDV:</span>
                    <span className="ml-2">{formatDate(selectedDossier.datePremierRdv)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Devis envoyé:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateDevisEnvoye)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Devis validé:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateDevisValide)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">RDV Travaux:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateRdvTravaux)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Facturé:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateFacture)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Réglé:</span>
                    <span className="ml-2">{formatDate(selectedDossier.dateReglement)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Financier</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Devis HT</p>
                    <p className="font-semibold">{formatCurrency(selectedDossier.devisHT)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Facturé HT</p>
                    <p className="font-semibold">{formatCurrency(selectedDossier.factureHT)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Reste dû</p>
                    <p className="font-semibold text-foreground">
                      {formatCurrency(selectedDossier.restedu)}
                    </p>
                </div>
              </div>

              {/* Documents générés — chargement à la demande (action explicite: clic dossier) */}
              <DossierDocumentsPanel
                dossierRef={selectedDossier.ref || null}
                agencySlug={null}
              />
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
