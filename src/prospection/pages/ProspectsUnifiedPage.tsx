/**
 * ProspectsUnifiedPage - Vue unifiée des prospects
 * Deux modes : "Explorer" (pool importé) et "Mes prospects" (fiches CRM créées)
 * Quand on sélectionne des prospects du pool → création automatique de fiches
 * Quand on clique une fiche → détail en place
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Search, Upload, Plus, X, Filter, FileSpreadsheet, Users, UserCheck,
  Phone, Globe, MapPin, Calendar, Star, ChevronRight, Building2, User,
  Hash, PlusCircle, PhoneCall, Mail, MapPinned, RotateCcw, MessageSquare,
  Edit2, Save, ArrowLeft, CheckSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProspectPool, useImportProspects, type ProspectPoolItem } from '../hooks/useProspectPool';
import {
  useProspectCards, useProspectCard, useCreateProspectCards, useUpdateProspectCard,
  useProspectInteractions, useCreateInteraction,
  PROSPECT_STATUS_CONFIG, type ProspectCard, type ProspectStatus, type ProspectInteraction,
} from '../hooks/useProspectCards';
import { parseProspectExcel } from '../utils/parseProspectExcel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'explorer' | 'mes-prospects';

export function ProspectsUnifiedPage() {
  const [mode, setMode] = useState<ViewMode>('explorer');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleCardCreated = useCallback(() => {
    setMode('mes-prospects');
  }, []);

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const handleBackFromDetail = useCallback(() => {
    setSelectedCardId(null);
  }, []);

  // Si une fiche est ouverte, afficher le détail
  if (selectedCardId) {
    return <ProspectDetail cardId={selectedCardId} onBack={handleBackFromDetail} />;
  }

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode('explorer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'explorer'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Explorer le pool
        </button>
        <button
          onClick={() => setMode('mes-prospects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'mes-prospects'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Mes prospects
        </button>
      </div>

      {mode === 'explorer' ? (
        <PoolExplorer onCardsCreated={handleCardCreated} />
      ) : (
        <MyProspects onSelectCard={handleSelectCard} />
      )}
    </div>
  );
}

// ===================== POOL EXPLORER =====================
function PoolExplorer({ onCardsCreated }: { onCardsCreated: () => void }) {
  const [search, setSearch] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [ville, setVille] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: prospects = [], isLoading } = useProspectPool({
    search: search || undefined,
    codePostal: codePostal || undefined,
    ville: ville || undefined,
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
    onCardsCreated();
  }, [prospects, selectedIds, createCardsMutation, onCardsCreated]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setCodePostal('');
    setVille('');
  }, []);

  const hasFilters = search || codePostal || ville;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} dans le pool
            {selectedIds.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                · {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-1" />
            {importing ? 'Import...' : 'Importer Excel'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, enseigne, représentant..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative w-full sm:w-44">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ville"
                value={ville}
                onChange={e => setVille(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative w-full sm:w-32">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="CP"
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
              <Upload className="w-4 h-4 mr-2" /> Importer un fichier Excel
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
                    <TableHead>Ville</TableHead>
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
                      className={`cursor-pointer ${selectedIds.has(p.id) ? 'bg-primary/5' : ''}`}
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
                      <TableCell className="font-medium text-sm">
                        {p.ville || '—'}
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
    </>
  );
}

// ===================== MES PROSPECTS (fiches CRM) =====================
function MyProspects({ onSelectCard }: { onSelectCard: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: cards = [], isLoading } = useProspectCards({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter as ProspectStatus : undefined,
  });

  const stats = useMemo(() => {
    return cards.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [cards]);

  return (
    <>
      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={`cursor-pointer ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Tous: {cards.length}
        </Badge>
        {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => {
          const count = stats[key] || 0;
          if (count === 0) return null;
          return (
            <Badge
              key={key}
              variant="outline"
              className={`cursor-pointer ${statusFilter === key ? 'ring-2 ring-primary' : ''} ${config.color}`}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
            >
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher une fiche..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {!isLoading && cards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun prospect sélectionné</h3>
            <p className="text-sm text-muted-foreground">
              Allez dans "Explorer le pool", filtrez et sélectionnez des prospects pour les ajouter ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table view for cards - more practical than grid */}
      {cards.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Dénomination</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prochain RDV</TableHead>
                    <TableHead>Dernier contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Représentant</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map(card => {
                    const statusConfig = PROSPECT_STATUS_CONFIG[card.status];
                    return (
                      <TableRow
                        key={card.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onSelectCard(card.id)}
                      >
                        <TableCell>
                          <div>
                            <span className="font-medium">{card.denomination}</span>
                            {card.enseigne && (
                              <span className="block text-xs text-muted-foreground">{card.enseigne}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{card.ville || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {card.next_rdv_at ? (
                            <span className="text-primary font-medium">
                              {format(new Date(card.next_rdv_at), 'dd/MM/yy HH:mm', { locale: fr })}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {card.last_contact_at
                            ? format(new Date(card.last_contact_at), 'dd/MM/yy', { locale: fr })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{card.telephone || '—'}</TableCell>
                        <TableCell className="text-sm">{card.representant || '—'}</TableCell>
                        <TableCell>
                          {card.score > 0 ? (
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < card.score ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />
                              ))}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ===================== DÉTAIL D'UNE FICHE =====================
const INTERACTION_ICONS: Record<string, React.ElementType> = {
  appel: PhoneCall, email: Mail, rdv: Calendar, visite: MapPinned, note: MessageSquare, relance: RotateCcw,
};
const INTERACTION_LABELS: Record<string, string> = {
  appel: 'Appel', email: 'Email', rdv: 'Rendez-vous', visite: 'Visite', note: 'Note', relance: 'Relance',
};

function ProspectDetail({ cardId, onBack }: { cardId: string; onBack: () => void }) {
  const { data: card, isLoading } = useProspectCard(cardId);
  const { data: interactions = [] } = useProspectInteractions(cardId);
  const updateCard = useUpdateProspectCard();
  const createInteraction = useCreateInteraction();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ type: 'appel' as ProspectInteraction['interaction_type'], summary: '', next_action: '' });
  const [editingRdv, setEditingRdv] = useState(false);
  const [rdvValue, setRdvValue] = useState('');

  if (isLoading || !card) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement...</div>;
  }

  const handleStatusChange = async (status: string) => {
    await updateCard.mutateAsync({ id: cardId, status: status as ProspectStatus });
    toast.success('Statut mis à jour');
  };

  const handleScoreChange = async (score: number) => {
    await updateCard.mutateAsync({ id: cardId, score });
  };

  const handleSaveNotes = async () => {
    await updateCard.mutateAsync({ id: cardId, notes: notesValue });
    setEditingNotes(false);
    toast.success('Notes enregistrées');
  };

  const handleSaveRdv = async () => {
    if (!rdvValue) return;
    await updateCard.mutateAsync({ id: cardId, next_rdv_at: new Date(rdvValue).toISOString(), status: 'rdv_planifie' });
    setEditingRdv(false);
    toast.success('RDV planifié');
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.summary.trim()) { toast.error('Veuillez ajouter un résumé'); return; }
    await createInteraction.mutateAsync({
      card_id: cardId,
      interaction_type: newInteraction.type,
      summary: newInteraction.summary,
      next_action: newInteraction.next_action || undefined,
    });
    setNewInteraction({ type: 'appel', summary: '', next_action: '' });
    setShowNewInteraction(false);
    toast.success('Interaction ajoutée');
  };

  const statusConfig = PROSPECT_STATUS_CONFIG[card.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{card.denomination}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {card.enseigne && <span>{card.enseigne}</span>}
            {card.ville && (
              <>
                {card.enseigne && <span>·</span>}
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{card.ville}</span>
              </>
            )}
          </div>
        </div>
        <Select value={card.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-44">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Info column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {card.adresse && (
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" /><span>{card.adresse}</span></div>
              )}
              {card.telephone && (
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${card.telephone}`} className="text-primary hover:underline">{card.telephone}</a></div>
              )}
              {card.site_web && (
                <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /><a href={card.site_web.startsWith('http') ? card.site_web : `https://${card.site_web}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{card.site_web}</a></div>
              )}
              {card.representant && (
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /><span>{card.representant}</span></div>
              )}
              {card.siren && (
                <div className="flex items-center gap-2"><Hash className="w-4 h-4 text-muted-foreground" /><span className="font-mono text-xs">SIREN: {card.siren}</span></div>
              )}
              {card.chiffre_affaire && (
                <div className="text-muted-foreground">CA: <span className="font-mono">{Number(card.chiffre_affaire).toLocaleString('fr-FR')} €</span></div>
              )}
              {card.tranche_effectif && (
                <div className="text-muted-foreground text-xs">Effectif: {card.tranche_effectif}</div>
              )}
            </CardContent>
          </Card>

          {/* Score */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Score prospect</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => handleScoreChange(i === card.score ? 0 : i)}>
                    <Star className={`w-6 h-6 transition-colors ${i <= card.score ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-300'}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* RDV */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Prochain RDV</span>
                <Button variant="ghost" size="sm" onClick={() => { setEditingRdv(true); setRdvValue(''); }}><Edit2 className="w-3.5 h-3.5" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingRdv ? (
                <div className="flex gap-2">
                  <Input type="datetime-local" value={rdvValue} onChange={e => setRdvValue(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handleSaveRdv}><Save className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingRdv(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : card.next_rdv_at ? (
                <p className="text-primary font-medium">{format(new Date(card.next_rdv_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun RDV planifié</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes & Interactions */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Notes</span>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(true); setNotesValue(card.notes || ''); }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea value={notesValue} onChange={e => setNotesValue(e.target.value)} rows={4} placeholder="Ajouter des notes sur ce prospect..." />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Annuler</Button>
                    <Button size="sm" onClick={handleSaveNotes}>Enregistrer</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{card.notes || 'Aucune note'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Historique des interactions</span>
                <Button size="sm" variant="outline" onClick={() => setShowNewInteraction(true)}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {showNewInteraction && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <Select value={newInteraction.type} onValueChange={v => setNewInteraction(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(INTERACTION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Résumé de l'interaction..." value={newInteraction.summary} onChange={e => setNewInteraction(p => ({ ...p, summary: e.target.value }))} rows={2} />
                  <Input placeholder="Prochaine action (optionnel)" value={newInteraction.next_action} onChange={e => setNewInteraction(p => ({ ...p, next_action: e.target.value }))} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowNewInteraction(false)}>Annuler</Button>
                    <Button size="sm" onClick={handleAddInteraction} disabled={createInteraction.isPending}>Ajouter</Button>
                  </div>
                </div>
              )}
              {interactions.length === 0 && !showNewInteraction && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune interaction enregistrée</p>
              )}
              {interactions.map(interaction => {
                const Icon = INTERACTION_ICONS[interaction.interaction_type] || MessageSquare;
                return (
                  <div key={interaction.id} className="flex gap-3 border-l-2 border-muted pl-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs">{INTERACTION_LABELS[interaction.interaction_type]}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(interaction.interaction_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                      </div>
                      {interaction.summary && <p className="text-sm whitespace-pre-wrap">{interaction.summary}</p>}
                      {interaction.next_action && <p className="text-xs text-primary mt-1">→ Prochaine action: {interaction.next_action}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}