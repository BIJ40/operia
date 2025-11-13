import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function DataBackup() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [exportData, setExportData] = useState('');

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleExportFromLocalStorage = () => {
    try {
      const data = {
        homeCards: localStorage.getItem('homeCards'),
        guideApogee: localStorage.getItem('guide-apogee-categories'),
        apporteurs: localStorage.getItem('apporteurs-nationaux-categories'),
        infos: localStorage.getItem('informations-utiles-categories'),
        exportDate: new Date().toISOString(),
        exportLocation: window.location.hostname
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      setExportData(jsonData);
      
      // Télécharger automatiquement
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `helpconfort-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Données exportées et fichier téléchargé !');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sauvegarde des Données</h1>
        <p className="text-muted-foreground">
          Exportez vos données du site en production
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="w-5 h-5" />
              Étape 1: Exporter depuis le site en ligne
            </CardTitle>
            <CardDescription className="text-green-800">
              <strong>IMPORTANT:</strong> Faites cette opération sur https://www.helpconfort.services/ (pas ici)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-3 text-green-900 bg-white p-4 rounded-md">
              <p><strong>Instructions:</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Allez sur <strong>https://www.helpconfort.services/</strong></li>
                <li>Connectez-vous en tant qu'admin</li>
                <li>Allez sur cette page: <strong>/data-backup</strong></li>
                <li>Cliquez sur le bouton ci-dessous</li>
                <li>Le fichier JSON sera téléchargé automatiquement</li>
                <li><strong>Gardez ce fichier précieusement !</strong></li>
              </ol>
            </div>

            <Button onClick={handleExportFromLocalStorage} size="lg" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exporter et Télécharger les Données
            </Button>
            
            {exportData && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-900">✅ Données exportées avec succès!</p>
                <Textarea
                  value={exportData}
                  readOnly
                  className="font-mono text-xs h-40 bg-white"
                  placeholder="Les données exportées apparaissent ici..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Pourquoi cette sauvegarde ?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3 text-orange-900">
            <p>
              <strong>Vos données actuelles sont stockées dans le navigateur (localStorage)</strong>
            </p>
            <p>
              Quand vous publiez une nouvelle version du site, il y a un risque que ces données soient perdues.
            </p>
            <p>
              <strong>Ce fichier de sauvegarde vous permet de:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Avoir une copie de sécurité de toutes vos données</li>
              <li>Les restaurer si nécessaire après la mise à jour</li>
              <li>Les migrer vers la nouvelle base de données Supabase</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Étape 2: Après avoir exporté</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Une fois que vous avez votre fichier de sauvegarde:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Gardez le fichier JSON téléchargé en lieu sûr</li>
              <li>Vous pouvez maintenant publier la nouvelle version</li>
              <li>Si besoin, contactez-moi avec ce fichier pour restaurer les données</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
