import { useState } from 'react';
import { Building2, Plus, Users, Check, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApporteurs } from '@/hooks/useApporteurs';
import { ApporteurCreateWizard } from '@/components/pilotage/ApporteurCreateWizard';
import { ApporteurDetailSheet } from '@/components/pilotage/ApporteurDetailSheet';

export function MesApporteursTab() {
  const { data: apporteurs, isLoading } = useApporteurs();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [selectedApporteurId, setSelectedApporteurId] = useState<string | null>(null);

  const selectedApporteur = apporteurs?.find(a => a.id === selectedApporteurId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Mes Apporteurs</h2>
            <p className="text-sm text-muted-foreground">
              Gérez les espaces apporteurs
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateWizard(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nouvel Espace
        </Button>
      </div>

      {/* Liste des apporteurs */}
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Apporteurs ({apporteurs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Chargement...
            </div>
          ) : !apporteurs?.length ? (
            <div className="text-center py-10">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucun espace apporteur créé
              </p>
              <Button onClick={() => setShowCreateWizard(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Créer le premier
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Liaison Apogée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apporteurs.map((apporteur) => (
                  <TableRow 
                    key={apporteur.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedApporteurId(apporteur.id)}
                  >
                    <TableCell className="font-medium">{apporteur.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{apporteur.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {apporteur.users_count ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {apporteur.apogee_client_id ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <ExternalLink className="h-3 w-3" />
                          ID {apporteur.apogee_client_id}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Non lié</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {apporteur.is_active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApporteurId(apporteur.id);
                        }}
                      >
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard de création */}
      <ApporteurCreateWizard
        open={showCreateWizard}
        onOpenChange={setShowCreateWizard}
      />

      {/* Sheet de détail */}
      <ApporteurDetailSheet
        apporteur={selectedApporteur || null}
        open={!!selectedApporteurId}
        onOpenChange={(open) => !open && setSelectedApporteurId(null)}
      />
    </div>
  );
}
