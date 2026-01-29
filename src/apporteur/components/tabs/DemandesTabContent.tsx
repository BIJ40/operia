/**
 * DemandesTabContent - Contenu de l'onglet Demandes
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  FileText, 
  Search, 
  PlusCircle, 
  Clock, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useApporteurDemandes, 
  ApporteurDemande,
  REQUEST_TYPE_LABELS, 
  STATUS_LABELS, 
  URGENCY_LABELS 
} from '../../hooks/useApporteurDemandes';
import { ApporteurDemandeDetailDrawer } from '../ApporteurDemandeDetailDrawer';
import { NouvelleDemandeDialog } from '../NouvelleDemandeDialog';

const PAGE_SIZE = 20;

export default function DemandesTabContent() {
  const { data: demandes, isLoading, error } = useApporteurDemandes();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDemande, setSelectedDemande] = useState<ApporteurDemande | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [demandeDialogOpen, setDemandeDialogOpen] = useState(false);

  const filteredDemandes = useMemo(() => {
    if (!demandes) return [];
    if (!search.trim()) return demandes;
    
    const searchLower = search.toLowerCase();
    return demandes.filter(d => 
      d.tenant_name.toLowerCase().includes(searchLower) ||
      d.address.toLowerCase().includes(searchLower) ||
      (d.city && d.city.toLowerCase().includes(searchLower))
    );
  }, [demandes, search]);

  const totalPages = Math.ceil(filteredDemandes.length / PAGE_SIZE);
  const paginatedDemandes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDemandes.slice(start, start + PAGE_SIZE);
  }, [filteredDemandes, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRowClick = (demande: ApporteurDemande) => {
    setSelectedDemande(demande);
    setDrawerOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Mes demandes
          </h1>
          <p className="text-muted-foreground">
            Historique de vos demandes d'intervention
            {demandes && demandes.length > 0 && (
              <span className="ml-2 text-sm">
                ({filteredDemandes.length} demande{filteredDemandes.length > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setDemandeDialogOpen(true)} className="gap-2 rounded-xl">
          <PlusCircle className="w-4 h-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par locataire, adresse ou ville..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive rounded-2xl">
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Erreur de chargement
              </h3>
              <p className="text-muted-foreground">
                Impossible de charger vos demandes. Veuillez réessayer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="rounded-2xl">
          <CardContent className="py-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && demandes && demandes.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucune demande
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Vous n'avez pas encore créé de demande d'intervention.
              </p>
              <Button onClick={() => setDemandeDialogOpen(true)} className="gap-2 rounded-xl">
                <PlusCircle className="w-4 h-4" />
                Créer ma première demande
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results State */}
      {!isLoading && !error && demandes && demandes.length > 0 && filteredDemandes.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun résultat
              </h3>
              <p className="text-muted-foreground">
                Aucune demande ne correspond à "{search}"
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !error && paginatedDemandes.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[100px]">Réf.</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead className="hidden md:table-cell">Adresse</TableHead>
                  <TableHead className="w-[120px]">Statut</TableHead>
                  <TableHead className="w-[80px]">Urgence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDemandes.map((demande) => {
                  const statusInfo = STATUS_LABELS[demande.status] || STATUS_LABELS.pending;
                  const urgencyInfo = URGENCY_LABELS[demande.urgency] || URGENCY_LABELS.normal;
                  const hasLinkedDossier = !!demande.apogee_project_id;
                  
                  return (
                    <TableRow 
                      key={demande.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(demande)}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(demande.created_at), 'dd/MM/yy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {demande.reference || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {REQUEST_TYPE_LABELS[demande.request_type] || demande.request_type}
                      </TableCell>
                      <TableCell>{demande.tenant_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {demande.city ? `${demande.address}, ${demande.city}` : demande.address}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs gap-1', statusInfo.color)}
                        >
                          {hasLinkedDossier && <ExternalLink className="w-3 h-3" />}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {demande.urgency === 'urgent' && (
                          <Badge variant="outline" className={cn('text-xs gap-1', urgencyInfo.color)}>
                            <AlertTriangle className="w-3 h-3" />
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl"
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Detail Drawer */}
      <ApporteurDemandeDetailDrawer
        demande={selectedDemande}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Nouvelle demande dialog */}
      <NouvelleDemandeDialog open={demandeDialogOpen} onOpenChange={setDemandeDialogOpen} />
    </div>
  );
}
