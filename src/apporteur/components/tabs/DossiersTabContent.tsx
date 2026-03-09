/**
 * DossiersTabContent - Contenu de l'onglet Dossiers (V2 enrichi)
 * Stepper horizontal + triple badges + colonne univers
 * Actions: refuser devis (single + bulk), facture réglée, dossier inactif
 */

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '../../hooks/useApporteurDossiers';
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
  RefreshCw,
  X,
  XCircle,
  CheckCircle2,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { DossierStepper } from '../cockpit/DossierStepper';
import type { DossierRowV2 } from '../../types/apporteur-dossier-v2';
import { RefuserDevisDialog } from '../dialogs/RefuserDevisDialog';
import { ValiderDevisDialog } from '../dialogs/ValiderDevisDialog';
import { FactureRegleeDialog } from '../dialogs/FactureRegleeDialog';
import { DossierInactifDialog } from '../dialogs/DossierInactifDialog';

type SortField = 'ref' | 'clientName' | 'status' | 'dateCreation' | 'factureHT' | 'restedu';
type SortDirection = 'asc' | 'desc';

export default function DossiersTabContent() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error, isFetching } = useApporteurDossiers();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dateCreation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDossier, setSelectedDossier] = useState<DossierRow | null>(null);
  const [alerteRefs, setAlerteRefs] = useState<string[] | null>(null);

  // Selection for bulk actions
  const [selectedRefs, setSelectedRefs] = useState<Set<string>>(new Set());

  // Dialog states
  const [refuserDevisRefs, setRefuserDevisRefs] = useState<string[]>([]);
  const [validerDevisRefs, setValiderDevisRefs] = useState<string[]>([]);
  const [factureRegleeRef, setFactureRegleeRef] = useState<string | null>(null);
  const [inactifRef, setInactifRef] = useState<string | null>(null);

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    const urlAlerteRefs = searchParams.get('alerteRefs');
    if (urlAlerteRefs) {
      const refs = urlAlerteRefs.split(',').filter(Boolean);
      setAlerteRefs(refs);
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('alerteRefs');
        return newParams;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const dossiers = data?.data?.dossiers || [];
  const totals = data?.data?.totals || { count: 0, resteDu: 0 };

  const STATUS_ORDER = ['en_cours', 'stand_by', 'devis_en_cours', 'devis_envoye', 'devis_valide', 'attente_paiement', 'facture', 'regle', 'clos', 'annule'];

  const statuses = useMemo(() => {
    const unique = new Set(dossiers.map(d => d.status));
    return STATUS_ORDER
      .filter(s => unique.has(s))
      .map(s => ({
        value: s,
        label: dossiers.find(d => d.status === s)?.statusLabel || s,
      }));
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    if (alerteRefs && alerteRefs.length > 0) {
      const refsSet = new Set(alerteRefs.map(r => r.toLowerCase()));
      result = result.filter(d => refsSet.has(d.ref.toLowerCase()));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(d =>
        d.ref.toLowerCase().includes(searchLower) ||
        d.clientName.toLowerCase().includes(searchLower) ||
        d.city.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

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
  }, [dossiers, search, statusFilter, sortField, sortDirection, alerteRefs]);

  const filteredTotals = useMemo(() => ({
    count: filteredDossiers.length,
    resteDu: filteredDossiers.reduce((sum, d) => sum + d.restedu, 0),
    factureHT: filteredDossiers.reduce((sum, d) => sum + d.factureHT, 0),
  }), [filteredDossiers]);

  // Dossiers with devis_envoye status (selectable for bulk refus)
  const devisEnvoyeRefs = useMemo(() =>
    new Set(filteredDossiers.filter(d => d.status === 'devis_envoye').map(d => d.ref)),
    [filteredDossiers]
  );

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

  const toggleSelection = (ref: string) => {
    setSelectedRefs(prev => {
      const next = new Set(prev);
      if (next.has(ref)) {
        next.delete(ref);
      } else {
        next.add(ref);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRefs.size === devisEnvoyeRefs.size) {
      setSelectedRefs(new Set());
    } else {
      setSelectedRefs(new Set(devisEnvoyeRefs));
    }
  };

  const handleBulkRefus = () => {
    const refs = Array.from(selectedRefs);
    if (refs.length > 0) {
      setRefuserDevisRefs(refs);
    }
  };

  const handleBulkValidation = () => {
    const refs = Array.from(selectedRefs);
    if (refs.length > 0) {
      setValiderDevisRefs(refs);
    }
  };

  // Determine available actions for a dossier
  const canRefuserDevis = (d: DossierRow) => d.status === 'devis_envoye';
  const canValiderDevis = (d: DossierRow) => d.status === 'devis_envoye';
  const canDeclareRegle = (d: DossierRow) => d.restedu > 0 && d.factureId !== null;
  const isInactif = (d: DossierRow) => d.status === 'stand_by' || d.status === 'en_cours';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" />
              Mes dossiers
            </h1>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <Card className="rounded-2xl">
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
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Mes dossiers
          </h1>
        </div>
        <Card className="border-[hsl(var(--ap-warning)/.4)] bg-[hsl(var(--ap-warning-light))] rounded-2xl">
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
    <div className="p-4 sm:p-6 space-y-6">
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
        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {selectedRefs.size > 0 && (
            <>
              <Button
                size="sm"
                className="gap-2 rounded-xl bg-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success)/.85)] text-white"
                onClick={handleBulkValidation}
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider {selectedRefs.size} devis
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 rounded-xl"
                onClick={handleBulkRefus}
              >
                <XCircle className="w-4 h-4" />
                Refuser {selectedRefs.size} devis
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            className="gap-2 rounded-xl"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Bannière filtre alerte */}
      {alerteRefs && alerteRefs.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--ap-warning-light))] border border-[hsl(var(--ap-warning)/.3)]">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--ap-warning))] shrink-0" />
          <span className="text-sm text-foreground flex-1">
            Filtre actif : <strong>{alerteRefs.length} dossier(s)</strong> issus d'une alerte
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setAlerteRefs(null)}
          >
            <X className="w-3 h-3 mr-1" />
            Effacer le filtre
          </Button>
        </div>
      )}

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="rounded-xl"
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
              className={cn('rounded-xl', statusFilter !== s.value ? cn(conf.bgColor, conf.color, 'border') : '')}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Table Card */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Checkbox column */}
                  <TableHead className="w-10">
                    {devisEnvoyeRefs.size > 0 && (
                      <Checkbox
                        checked={selectedRefs.size > 0 && selectedRefs.size === devisEnvoyeRefs.size}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Tout sélectionner"
                      />
                    )}
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
                  <TableHead className="hidden lg:table-cell text-right">Devis HT</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('factureHT')}
                  >
                    <div className="flex items-center justify-end">
                      Facturé HT <SortIcon field="factureHT" />
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun dossier trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDossiers.map((d) => {
                    const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.en_cours;
                    const isSelectable = devisEnvoyeRefs.has(d.ref);
                    return (
                      <TableRow 
                        key={d.id} 
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        {/* Checkbox */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isSelectable ? (
                            <Checkbox
                              checked={selectedRefs.has(d.ref)}
                              onCheckedChange={() => toggleSelection(d.ref)}
                              aria-label={`Sélectionner ${d.ref}`}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell onClick={() => setSelectedDossier(d)}>
                          <div>
                            <div className="font-medium">{d.clientName}</div>
                            <div className="text-xs text-muted-foreground">{d.city}</div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => setSelectedDossier(d)}>
                          <Badge className={cn('text-xs', statusConf.bgColor, statusConf.color)}>
                            {d.status === 'stand_by' ? '⏳ ' : ''}{d.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm" onClick={() => setSelectedDossier(d)}>
                          {formatDate(d.datePremierRdv)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-right font-medium" onClick={() => setSelectedDossier(d)}>
                          {d.devisHT > 0 ? formatCurrency(d.devisHT) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium" onClick={() => setSelectedDossier(d)}>
                          {d.factureHT > 0 ? formatCurrency(d.factureHT) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground" onClick={() => setSelectedDossier(d)}>
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
              {/* V2 Stepper */}
              <div className="pb-2">
                <DossierStepper
                  v2={(selectedDossier as DossierRowV2)?.v2}
                  dates={{
                    dateCreation: selectedDossier.dateCreation,
                    datePremierRdv: selectedDossier.datePremierRdv,
                    dateDevisEnvoye: selectedDossier.dateDevisEnvoye,
                    dateDevisValide: selectedDossier.dateDevisValide,
                    dateFacture: selectedDossier.dateFacture,
                    dateReglement: selectedDossier.dateReglement,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedDossier.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ville</p>
                  <p className="font-medium">{selectedDossier.city || '-'}</p>
                </div>
                {selectedDossier.rawState && (
                  <div>
                    <p className="text-sm text-muted-foreground">État Apogée</p>
                    <p className="font-medium">{selectedDossier.rawState}</p>
                  </div>
                )}
              </div>

              {/* Triple badges (V2) or single badge (V1) */}
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">Statuts</p>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const v2 = (selectedDossier as DossierRowV2)?.v2;
                    if (v2?.status) {
                      return (
                        <>
                          <Badge className={cn(
                            STATUS_CONFIG[selectedDossier.status]?.bgColor,
                            STATUS_CONFIG[selectedDossier.status]?.color
                          )}>
                            📁 {selectedDossier.statusLabel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            📄 Devis: {v2.status.devis.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            🧾 Facture: {v2.status.facture.replace('_', ' ')}
                          </Badge>
                        </>
                      );
                    }
                    return (
                      <Badge className={cn(
                        STATUS_CONFIG[selectedDossier.status]?.bgColor,
                        STATUS_CONFIG[selectedDossier.status]?.color
                      )}>
                        {selectedDossier.statusLabel}
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              {/* Univers (V2) */}
              {(() => {
                const v2 = (selectedDossier as DossierRowV2)?.v2;
                if (v2?.universes && v2.universes.length > 0) {
                  return (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Univers</p>
                      <div className="flex flex-wrap gap-1.5">
                        {v2.universes.map(u => (
                          <Badge key={u} variant="secondary" className="text-xs">{u}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Financier */}
              {selectedDossier.factureHT > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Financier</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Facturé HT:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(selectedDossier.factureHT)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reste dû:</span>
                      <span className={cn(
                        "ml-2 font-semibold",
                        selectedDossier.restedu > 0 ? "text-[hsl(var(--ap-danger))]" : "text-[hsl(var(--ap-success))]"
                      )}>
                        {selectedDossier.restedu > 0 ? formatCurrency(selectedDossier.restedu) : 'Réglé'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action Buttons ── */}
              {(canRefuserDevis(selectedDossier) || canValiderDevis(selectedDossier) || canDeclareRegle(selectedDossier) || isInactif(selectedDossier)) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {canValiderDevis(selectedDossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[hsl(var(--ap-success)/.4)] text-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success-light))]"
                        onClick={() => {
                          setSelectedDossier(null);
                          setValiderDevisRefs([selectedDossier.ref]);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Valider le devis
                      </Button>
                    )}
                    {canRefuserDevis(selectedDossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[hsl(var(--ap-danger)/.4)] text-[hsl(var(--ap-danger))] hover:bg-[hsl(var(--ap-danger-light))]"
                        onClick={() => {
                          setSelectedDossier(null);
                          setRefuserDevisRefs([selectedDossier.ref]);
                        }}
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser le devis
                      </Button>
                    )}
                    {canDeclareRegle(selectedDossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-[hsl(var(--ap-success)/.4)] text-[hsl(var(--ap-success))] hover:bg-[hsl(var(--ap-success-light))]"
                        onClick={() => {
                          setSelectedDossier(null);
                          setFactureRegleeRef(selectedDossier.ref);
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Déclarer réglée
                      </Button>
                    )}
                    {isInactif(selectedDossier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSelectedDossier(null);
                          setInactifRef(selectedDossier.ref);
                        }}
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        Action dossier
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialogs */}
      <RefuserDevisDialog
        open={refuserDevisRefs.length > 0}
        onOpenChange={(open) => { if (!open) { setRefuserDevisRefs([]); setSelectedRefs(new Set()); } }}
        dossierRefs={refuserDevisRefs}
      />
      <FactureRegleeDialog
        open={!!factureRegleeRef}
        onOpenChange={(open) => { if (!open) setFactureRegleeRef(null); }}
        dossierRef={factureRegleeRef || ''}
      />
      <DossierInactifDialog
        open={!!inactifRef}
        onOpenChange={(open) => { if (!open) setInactifRef(null); }}
        dossierRef={inactifRef || ''}
      />
    </div>
  );
}
