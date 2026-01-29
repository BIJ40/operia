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
      {/* Header - Style Warm Pastel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-warm-blue/20 to-warm-teal/15 border border-warm-blue/30">
            <Building2 className="h-5 w-5 text-warm-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Mes Apporteurs</h2>
            <p className="text-sm text-muted-foreground">
              Gérez les espaces apporteurs
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateWizard(true)} 
          size="sm"
          className="rounded-xl bg-warm-blue/90 hover:bg-warm-blue text-white shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nouvel Espace
        </Button>
      </div>

      {/* Card - Style Warm Pastel */}
      <Card className="rounded-2xl border-border/50 shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader className="py-4 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2 text-foreground/90">
            <div className="p-1.5 rounded-lg bg-warm-purple/15">
              <Users className="h-4 w-4 text-warm-purple" />
            </div>
            Apporteurs ({apporteurs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-warm-blue/30 border-t-warm-blue rounded-full animate-spin" />
                <span>Chargement...</span>
              </div>
            </div>
          ) : !apporteurs?.length ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Aucun espace apporteur créé
              </p>
              <Button 
                onClick={() => setShowCreateWizard(true)} 
                size="sm"
                className="rounded-xl bg-warm-blue/90 hover:bg-warm-blue text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Créer le premier
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/30 bg-muted/30">
                    <TableHead className="text-muted-foreground font-medium">Nom</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Type</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Utilisateurs</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Liaison Apogée</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Statut</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apporteurs.map((apporteur) => (
                    <TableRow 
                      key={apporteur.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/20"
                      onClick={() => setSelectedApporteurId(apporteur.id)}
                    >
                      <TableCell className="font-medium text-foreground">{apporteur.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="text-xs rounded-lg border-warm-purple/30 bg-warm-purple/10 text-warm-purple"
                        >
                          {apporteur.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {apporteur.users_count ?? 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        {apporteur.apogee_client_id ? (
                          <Badge 
                            variant="secondary" 
                            className="gap-1 text-xs rounded-lg bg-warm-teal/10 text-warm-teal border-warm-teal/30"
                          >
                            <ExternalLink className="h-3 w-3" />
                            ID {apporteur.apogee_client_id}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">Non lié</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {apporteur.is_active ? (
                          <Badge className="bg-warm-green/15 text-warm-green border border-warm-green/30 text-xs rounded-lg">
                            <Check className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge 
                            variant="secondary" 
                            className="bg-destructive/10 text-destructive border border-destructive/30 text-xs rounded-lg"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
            </div>
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
