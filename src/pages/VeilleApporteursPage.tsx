/**
 * Page Veille Apporteurs - Radar temps réel de la performance apporteurs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, TrendingDown, AlertTriangle, CheckCircle, Search, Filter, ArrowUpDown, CalendarIcon, RefreshCw, Eye, Radar } from 'lucide-react';
import { useVeilleApporteurs, VeilleFilterType, VeilleSortKey } from '@/statia/hooks/useVeilleApporteurs';
import { VeilleApporteurConsolide } from '@/statia/engines/veilleApporteursEngine';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import { useSessionState } from '@/hooks/useSessionState';

const formatCurrency = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const formatPercent = (v: number | null) => v === null ? 'N/A' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <Card className={cn("border-l-4", color)}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </CardContent>
    </Card>
  );
}

function ApporteurBadges({ apporteur }: { apporteur: VeilleApporteurConsolide }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {apporteur.isDormant && <Badge variant="destructive" className="text-xs">Dormant</Badge>}
      {apporteur.isEnDeclassement && <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Déclin</Badge>}
      {apporteur.isSousSeuil && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Sous seuil</Badge>}
      {apporteur.isNouveau && <Badge variant="secondary" className="text-xs">Nouveau</Badge>}
      {!apporteur.isDormant && !apporteur.isEnDeclassement && !apporteur.isSousSeuil && !apporteur.isNouveau && (
        <Badge variant="outline" className="text-xs border-green-500 text-green-600">OK</Badge>
      )}
    </div>
  );
}

function ApporteurDrawer({ apporteur, onClose }: { apporteur: VeilleApporteurConsolide | null; onClose: () => void }) {
  if (!apporteur) return null;
  
  return (
    <Dialog open={!!apporteur} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {apporteur.apporteurNom}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-6 space-y-6">
          <div className="flex gap-2"><ApporteurBadges apporteur={apporteur} /></div>
          
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Score Risque</p>
              <p className={cn("text-xl font-bold", apporteur.scoreRisque > 50 ? "text-destructive" : apporteur.scoreRisque > 25 ? "text-orange-500" : "text-green-600")}>{apporteur.scoreRisque}/100</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Jours d'inactivité</p>
              <p className="text-xl font-bold">{apporteur.joursInactivite}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">CA Période A</p>
              <p className="text-xl font-bold">{formatCurrency(apporteur.CA_A_HT)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">CA Période B</p>
              <p className="text-xl font-bold">{formatCurrency(apporteur.CA_B_HT)}</p>
            </CardContent></Card>
          </div>
          
          <Card><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Variation CA</p>
            <p className={cn("text-2xl font-bold", (apporteur.variationPct ?? 0) < 0 ? "text-destructive" : "text-green-600")}>{formatPercent(apporteur.variationPct)}</p>
          </CardContent></Card>
          
          {apporteur.lastProjectDate && (
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Dernière demande</p>
              <p className="text-lg">{format(new Date(apporteur.lastProjectDate), 'dd MMMM yyyy', { locale: fr })}</p>
            </CardContent></Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VeilleApporteursPage() {
  const {
    apporteurs, kpis, isLoading, filters, activeFilter, sortKey, sortDirection, searchQuery, selectedApporteur,
    updateFilters, resetFilters, setActiveFilter, toggleSort, setSearchQuery, setSelectedApporteur, refetch
  } = useVeilleApporteurs();
  
  // Affichage filtres persisté
  const [showFilters, setShowFilters] = useSessionState<boolean>('veille-show-filters', false);
  
  const FILTER_TABS: { id: VeilleFilterType; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'dormants', label: 'Dormants' },
    { id: 'declassement', label: 'En déclin' },
    { id: 'sous_seuil', label: 'Sous seuil' },
    { id: 'sains', label: 'OK' },
  ];
  
  const SortableHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: VeilleSortKey }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort(sortKeyVal)}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyVal && <ArrowUpDown className={cn("h-3 w-3", sortDirection === 'asc' && "rotate-180")} />}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Radar className="w-6 h-6 text-primary" />
          Veille Apporteurs
        </h1>
        <p className="text-muted-foreground">Radar temps réel de la performance apporteurs (demandes & CA HT)</p>
      </div>
      
      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un apporteur..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />Filtres</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Actualiser</Button>
          </div>
          
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><Label className="text-xs">Seuil inactivité (jours)</Label><Input type="number" value={filters.seuilInactivite} onChange={e => updateFilters({ seuilInactivite: parseInt(e.target.value) || 30 })} /></div>
              <div><Label className="text-xs">Seuil CA (€)</Label><Input type="number" value={filters.seuilCA} onChange={e => updateFilters({ seuilCA: parseInt(e.target.value) || 5000 })} /></div>
              <div className="col-span-2 flex justify-end items-end"><Button variant="ghost" size="sm" onClick={resetFilters}>Réinitialiser</Button></div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Apporteurs actifs" value={kpis.totalActifs} icon={Building2} color="border-l-blue-500" />
          <KpiCard title="Dormants" value={kpis.dormants} icon={AlertTriangle} color="border-l-red-500" />
          <KpiCard title="En déclin" value={kpis.enDeclassement} icon={TrendingDown} color="border-l-orange-500" />
          <KpiCard title="Sous seuil CA" value={kpis.sousSeuil} icon={AlertTriangle} color="border-l-yellow-500" />
        </div>
      )}
      
      {/* Filtres rapides */}
      <Tabs value={activeFilter} onValueChange={v => setActiveFilter(v as VeilleFilterType)}>
        <TabsList>{FILTER_TABS.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}</TabsList>
      </Tabs>
      
      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : apporteurs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun apporteur trouvé</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Apporteur" sortKeyVal="nom" />
                    <TableHead className="hidden md:table-cell">Dernière demande</TableHead>
                    <SortableHeader label="Inactivité" sortKeyVal="joursInactivite" />
                    <TableHead className="hidden lg:table-cell">CA Période A</TableHead>
                    <TableHead className="hidden lg:table-cell">CA Période B</TableHead>
                    <SortableHeader label="Variation" sortKeyVal="variationPct" />
                    <TableHead>Statut</TableHead>
                    <SortableHeader label="Risque" sortKeyVal="scoreRisque" />
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apporteurs.map(a => (
                    <TableRow key={a.apporteurId} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedApporteur(a)}>
                      <TableCell className="font-medium">{a.apporteurNom}</TableCell>
                      <TableCell className="hidden md:table-cell">{a.lastProjectDate ? format(new Date(a.lastProjectDate), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{a.joursInactivite}j</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatCurrency(a.CA_A_HT)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatCurrency(a.CA_B_HT)}</TableCell>
                      <TableCell className={cn((a.variationPct ?? 0) < 0 ? "text-destructive" : "text-green-600")}>{formatPercent(a.variationPct)}</TableCell>
                      <TableCell><ApporteurBadges apporteur={a} /></TableCell>
                      <TableCell><Badge variant={a.scoreRisque > 50 ? "destructive" : a.scoreRisque > 25 ? "outline" : "secondary"}>{a.scoreRisque}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ApporteurDrawer apporteur={selectedApporteur} onClose={() => setSelectedApporteur(null)} />
    </div>
  );
}
