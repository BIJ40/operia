/**
 * AdminApporteurs - Gestion des apporteurs (organisations)
 * Phase 3 : CRUD apporteurs + invitation utilisateurs
 * Accès N2+ uniquement, scoped par agency
 */

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Building2, Users, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useApporteurs, useToggleApporteurStatus } from '@/hooks/useApporteurs';
import { ApporteurCreateDialog } from '@/components/admin/apporteurs/ApporteurCreateDialog';
import { ApporteurDetailDrawer } from '@/components/admin/apporteurs/ApporteurDetailDrawer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  agence_immo: 'Agence Immo',
  syndic: 'Syndic',
  assurance: 'Assurance',
  courtier: 'Courtier',
};

export default function AdminApporteurs() {
  const [search, setSearch] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedApporteurId, setSelectedApporteurId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const { data: apporteurs, isLoading, error, refetch } = useApporteurs();
  const toggleStatus = useToggleApporteurStatus();

  // Filter and paginate
  const filtered = (apporteurs || []).filter(a => {
    const matchesSearch = !search || 
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !showInactiveOnly || !a.is_active;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center text-destructive">
            Erreur lors du chargement des apporteurs
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Apporteurs</h1>
                <p className="text-muted-foreground">
                  Gérez les organisations apporteurs et leurs utilisateurs
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Apporteur
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou type..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showInactiveOnly ? "default" : "outline"}
                  onClick={() => setShowInactiveOnly(!showInactiveOnly)}
                >
                  {showInactiveOnly ? 'Inactifs uniquement' : 'Tous'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Liste des apporteurs ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'Aucun apporteur trouvé' : 'Aucun apporteur créé'}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Actif</TableHead>
                        <TableHead className="text-center">Apogée ID</TableHead>
                        <TableHead className="text-center">Utilisateurs</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((apporteur) => (
                        <TableRow key={apporteur.id}>
                          <TableCell className="font-medium">{apporteur.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {TYPE_LABELS[apporteur.type] || apporteur.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={apporteur.is_active ? "default" : "secondary"}>
                              {apporteur.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {apporteur.apogee_client_id || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {apporteur.users_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(apporteur.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedApporteurId(apporteur.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(apporteur.id, apporteur.is_active)}
                              disabled={toggleStatus.isPending}
                            >
                              {apporteur.is_active ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <span className="flex items-center px-3 text-sm text-muted-foreground">
                        Page {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
      </Card>

      {/* Dialogs */}
      <ApporteurCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      <ApporteurDetailDrawer
        apporteurId={selectedApporteurId}
        onClose={() => setSelectedApporteurId(null)}
        onRefresh={refetch}
      />
    </div>
  );
}
