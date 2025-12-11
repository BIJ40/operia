import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Calendar, Euro, FileText, User, Wrench } from 'lucide-react';
import { DataService } from '../services/dataService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DossierDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number | string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiProject = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiClient = any;

export function DossierDetailDialog({ open, onOpenChange, projectId }: DossierDetailDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dossier-detail', projectId],
    enabled: open && !!projectId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false);
      
      const project: ApiProject = apiData.projects?.find((p: ApiProject) => String(p.id) === String(projectId));
      if (!project) throw new Error('Dossier non trouvé');
      
      const client: ApiClient = apiData.clients?.find((c: ApiClient) => String(c.id) === String(project.clientId));
      const devis = apiData.devis?.filter((d: ApiProject) => String(d.projectId) === String(projectId)) || [];
      const factures = apiData.factures?.filter((f: ApiProject) => String(f.projectId) === String(projectId)) || [];
      const interventions = apiData.interventions?.filter((i: ApiProject) => String(i.projectId) === String(projectId)) || [];
      
      return { project, client, devis, factures, interventions };
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Détails du dossier</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Erreur lors du chargement du dossier</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Référence</p>
                    <p className="font-medium">{data.project.name || data.project.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge variant="secondary">
                      {data.project.state || data.project.data?.etape || 'Non défini'}
                    </Badge>
                  </div>
                  {data.project.created_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de création</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(data.project.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                  {data.project.totalHT && (
                    <div>
                      <p className="text-sm text-muted-foreground">Montant HT</p>
                      <p className="font-medium flex items-center gap-1">
                        <Euro className="w-4 h-4" />
                        {data.project.totalHT.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Client */}
            {data.client && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nom</p>
                      <p className="font-medium">
                        {data.client.raisonSociale || 
                         `${data.client.nom || ''} ${data.client.prenom || ''}`.trim() ||
                         'Non renseigné'}
                      </p>
                    </div>
                    {data.client.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{data.client.email}</p>
                      </div>
                    )}
                    {data.client.tel && (
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{data.client.tel}</p>
                      </div>
                    )}
                    {data.client.adresse && (
                      <div>
                        <p className="text-sm text-muted-foreground">Adresse</p>
                        <p className="font-medium">
                          {data.client.adresse}
                          {data.client.codePostal && ` ${data.client.codePostal}`}
                          {data.client.ville && ` ${data.client.ville}`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Devis */}
            {data.devis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Devis ({data.devis.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.devis.map((devis, idx) => (
                      <div key={devis.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">Devis #{idx + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {devis.date && format(new Date(devis.date), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={devis.state === 'order' ? 'default' : 'secondary'}>
                            {devis.state || 'Non défini'}
                          </Badge>
                          {devis.totalHT && (
                            <p className="text-sm font-medium mt-1">{devis.totalHT.toLocaleString('fr-FR')} € HT</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Factures */}
            {data.factures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Factures ({data.factures.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.factures.map((facture) => (
                      <div key={facture.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{facture.numeroFacture || `Facture ${facture.id}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {facture.date && format(new Date(facture.date), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={facture.isPaid ? 'default' : 'destructive'}>
                            {facture.isPaid ? 'Payée' : 'En attente'}
                          </Badge>
                          {facture.totalTTC && (
                            <p className="text-sm font-medium mt-1">{facture.totalTTC.toLocaleString('fr-FR')} € TTC</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interventions */}
            {data.interventions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Interventions ({data.interventions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.interventions.slice(0, 5).map((intervention) => (
                      <div key={intervention.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{intervention.type || 'Intervention'}</p>
                          <p className="text-sm text-muted-foreground">
                            {intervention.date && format(new Date(intervention.date), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {intervention.state || 'Programmée'}
                        </Badge>
                      </div>
                    ))}
                    {data.interventions.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        + {data.interventions.length - 5} autre(s) intervention(s)
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
