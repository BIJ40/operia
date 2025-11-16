import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminBackup() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  if (!isAdmin) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Accès refusé. Cette page est réservée aux administrateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const exportAllData = async () => {
    setExporting(true);
    try {
      // Récupérer toutes les données
      const [blocksResult, apporteurBlocksResult, documentsResult, categoriesResult, sectionsResult] = await Promise.all([
        supabase.from('blocks').select('*').order('order'),
        supabase.from('apporteur_blocks').select('*').order('order'),
        supabase.from('documents').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('sections').select('*'),
      ]);

      if (blocksResult.error) throw blocksResult.error;
      if (apporteurBlocksResult.error) throw apporteurBlocksResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (sectionsResult.error) throw sectionsResult.error;

      const backupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          blocks: blocksResult.data || [],
          apporteur_blocks: apporteurBlocksResult.data || [],
          documents: documentsResult.data || [],
          categories: categoriesResult.data || [],
          sections: sectionsResult.data || [],
        },
        stats: {
          totalBlocks: (blocksResult.data?.length || 0) + (apporteurBlocksResult.data?.length || 0),
          totalDocuments: documentsResult.data?.length || 0,
          totalCategories: categoriesResult.data?.length || 0,
          totalSections: sectionsResult.data?.length || 0,
        }
      };

      // Créer le fichier JSON et le télécharger
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-helpogee-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackup(new Date());
      toast({
        title: 'Export réussi !',
        description: `${backupData.stats.totalBlocks} blocs, ${backupData.stats.totalDocuments} documents exportés`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Impossible d\'exporter les données',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.data) {
        throw new Error('Format de fichier invalide');
      }

      // Demander confirmation
      if (!confirm(`⚠️ ATTENTION: Cette opération va ÉCRASER toutes les données actuelles.\n\nVoulez-vous vraiment continuer ?\n\nDonnées à importer:\n- ${backupData.stats?.totalBlocks || 0} blocs\n- ${backupData.stats?.totalDocuments || 0} documents`)) {
        setImporting(false);
        return;
      }

      // Supprimer les données existantes
      await Promise.all([
        supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('apporteur_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      // Insérer les nouvelles données
      const insertPromises = [];
      
      if (backupData.data.blocks?.length > 0) {
        insertPromises.push(supabase.from('blocks').insert(backupData.data.blocks));
      }
      
      if (backupData.data.apporteur_blocks?.length > 0) {
        insertPromises.push(supabase.from('apporteur_blocks').insert(backupData.data.apporteur_blocks));
      }

      await Promise.all(insertPromises);

      toast({
        title: 'Import réussi !',
        description: 'Les données ont été restaurées. Rechargez la page.',
      });

      // Recharger la page après 2 secondes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Erreur import:', error);
      toast({
        title: 'Erreur d\'import',
        description: error instanceof Error ? error.message : 'Fichier invalide',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Sauvegarde & Restauration</h1>
        <p className="text-muted-foreground">
          Exportez et importez toutes vos données en toute sécurité
        </p>
      </div>

      <div className="grid gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exporter les données
            </CardTitle>
            <CardDescription>
              Téléchargez une sauvegarde complète de toutes vos données au format JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Ce qui sera exporté :</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Tous les blocs Apogée (catégories, sections, contenu)</li>
                <li>✓ Tous les blocs Apporteurs (catégories, sous-catégories, sections)</li>
                <li>✓ Tous les documents liés</li>
                <li>✓ Toutes les métadonnées</li>
              </ul>
            </div>
            
            {lastBackup && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Dernière sauvegarde : {lastBackup.toLocaleString('fr-FR')}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={exportAllData} 
              disabled={exporting}
              size="lg"
              className="w-full"
            >
              {exporting ? (
                <>
                  <Database className="w-4 h-4 mr-2 animate-pulse" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger la sauvegarde JSON
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Upload className="w-5 h-5" />
              Importer les données
            </CardTitle>
            <CardDescription>
              Restaurez vos données depuis un fichier de sauvegarde JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>ATTENTION:</strong> L'import va ÉCRASER toutes les données actuelles. 
                Assurez-vous d'avoir fait une sauvegarde avant d'importer !
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Avant d'importer :</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1. Exportez vos données actuelles (au cas où)</li>
                <li>2. Vérifiez que le fichier JSON est valide</li>
                <li>3. Confirmez que vous voulez écraser les données</li>
              </ul>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importData}
                disabled={importing}
                className="hidden"
                id="import-file"
              />
              <Button
                onClick={() => document.getElementById('import-file')?.click()}
                disabled={importing}
                variant="outline"
                size="lg"
                className="w-full border-orange-200 dark:border-orange-800"
              >
                {importing ? (
                  <>
                    <Database className="w-4 h-4 mr-2 animate-pulse" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner un fichier JSON
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Les fichiers de sauvegarde sont au format JSON lisible</p>
            <p>• Vous pouvez les ouvrir avec n'importe quel éditeur de texte</p>
            <p>• Stockez vos sauvegardes dans un endroit sûr (Dropbox, Google Drive, etc.)</p>
            <p>• Faites des sauvegardes régulières pour éviter toute perte de données</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
