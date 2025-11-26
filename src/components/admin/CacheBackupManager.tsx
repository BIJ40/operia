import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCacheBackup } from '@/hooks/use-cache-backup';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, Trash2, Database, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function CacheBackupManager() {
  const { backups, metadata, loading, loadBackups, restoreBackup, cleanExpiredBackups, clearAllBackups, printReport } = useCacheBackup();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState<string | null>(null);

  const handleRestore = async (key: string) => {
    setRestoring(key);
    try {
      const success = await restoreBackup(key);
      if (success) {
        toast({
          title: 'Backup restauré',
          description: `Le cache "${key}" a été restauré avec succès`,
        });
        // Recharger la page pour appliquer les données restaurées
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast({
          title: 'Échec de la restauration',
          description: `Impossible de restaurer "${key}"`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la restauration',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  const handleCleanExpired = async () => {
    const count = await cleanExpiredBackups();
    toast({
      title: 'Nettoyage effectué',
      description: `${count} backup(s) expiré(s) supprimé(s)`,
    });
  };

  const handleClearAll = async () => {
    const success = await clearAllBackups();
    if (success) {
      toast({
        title: 'Backups supprimés',
        description: 'Tous les backups ont été supprimés',
      });
    } else {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les backups',
        variant: 'destructive',
      });
    }
  };

  const handlePrintReport = async () => {
    await printReport();
    toast({
      title: 'Rapport généré',
      description: 'Consultez la console pour voir le rapport détaillé',
    });
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backups actifs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-muted-foreground">
              Clés sauvegardées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total versions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metadata?.backupCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Versions sauvegardées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernier backup</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metadata?.lastBackup 
                ? formatDistanceToNow(metadata.lastBackup, { locale: fr, addSuffix: true })
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Dernière sauvegarde
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions globales */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Gérer les backups et le cache
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={loadBackups}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>

          <Button
            onClick={handleCleanExpired}
            variant="outline"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Nettoyer expirés
          </Button>

          <Button
            onClick={handlePrintReport}
            variant="outline"
          >
            <Info className="w-4 h-4 mr-2" />
            Rapport console
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Tout supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer tous les backups ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Tous les backups seront définitivement supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Liste des backups */}
      <Card>
        <CardHeader>
          <CardTitle>Backups disponibles</CardTitle>
          <CardDescription>
            Restaurer ou gérer les backups individuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun backup disponible
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.key}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{backup.key}</div>
                    <div className="text-sm text-muted-foreground">
                      {backup.versions} version(s) • Dernière: v{backup.latest}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      v{backup.latest}
                    </Badge>
                    
                    <Button
                      size="sm"
                      onClick={() => handleRestore(backup.key)}
                      disabled={restoring === backup.key}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {restoring === backup.key ? 'Restauration...' : 'Restaurer'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle>Informations système</CardTitle>
          <CardDescription>
            Détails sur le stockage et les sauvegardes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Système de stockage:</span>
            <span className="font-medium">IndexedDB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Conservation des backups:</span>
            <span className="font-medium">24 heures</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Versions par clé:</span>
            <span className="font-medium">3 versions maximum</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Restauration automatique:</span>
            <span className="font-medium text-green-600">Activée ✓</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
