import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function DataBackup() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);

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
        exportDate: new Date().toISOString()
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
      
      toast.success('Données exportées depuis localStorage !');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleExportFromSupabase = async () => {
    setLoading(true);
    try {
      const [homeCards, categories, sections] = await Promise.all([
        supabase.from('home_cards').select('*').order('display_order'),
        supabase.from('categories').select('*').order('scope, display_order'),
        supabase.from('sections').select('*').order('category_id, display_order')
      ]);

      const data = {
        homeCards: homeCards.data,
        categories: categories.data,
        sections: sections.data,
        exportDate: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(data, null, 2);
      setExportData(jsonData);
      
      // Télécharger automatiquement
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `helpconfort-supabase-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Données exportées depuis Supabase !');
    } catch (error) {
      console.error('Erreur export Supabase:', error);
      toast.error('Erreur lors de l\'export Supabase');
    } finally {
      setLoading(false);
    }
  };

  const handleImportToSupabase = async () => {
    if (!importData.trim()) {
      toast.error('Veuillez coller les données à importer');
      return;
    }

    setLoading(true);
    try {
      const data = JSON.parse(importData);
      
      // Nettoyer les tables existantes
      await Promise.all([
        supabase.from('sections').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('home_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      // Importer home_cards
      if (data.homeCards) {
        const cardsToInsert = Array.isArray(data.homeCards) 
          ? data.homeCards 
          : JSON.parse(data.homeCards).map((card: any, index: number) => ({
              title: card.title,
              description: card.description,
              icon: card.icon,
              color_preset: card.colorPreset || card.color_preset,
              link: card.link,
              display_order: index
            }));
        
        if (cardsToInsert.length > 0) {
          await supabase.from('home_cards').insert(cardsToInsert);
        }
      }

      // Importer categories et sections depuis localStorage format
      const scopes = ['guide-apogee', 'apporteurs-nationaux', 'informations-utiles'];
      for (const scope of scopes) {
        const key = scope === 'guide-apogee' ? 'guideApogee' : scope === 'apporteurs-nationaux' ? 'apporteurs' : 'infos';
        const localData = data[key];
        
        if (localData) {
          const categories = typeof localData === 'string' ? JSON.parse(localData) : localData;
          
          for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            const { data: newCat, error } = await supabase
              .from('categories')
              .insert({
                title: cat.title,
                icon: cat.icon || 'BookOpen',
                color_preset: cat.colorPreset || cat.color_preset || 'blue',
                scope: scope,
                display_order: i
              })
              .select()
              .single();

            if (!error && newCat && cat.sections) {
              for (let j = 0; j < cat.sections.length; j++) {
                const section = cat.sections[j];
                await supabase.from('sections').insert({
                  category_id: newCat.id,
                  title: section.title,
                  content: section.content || [],
                  display_order: j
                });
              }
            }
          }
        }
      }

      // Importer depuis format Supabase direct
      if (data.categories && Array.isArray(data.categories)) {
        const categoryMap = new Map();
        
        for (const cat of data.categories) {
          const { data: newCat, error } = await supabase
            .from('categories')
            .insert({
              title: cat.title,
              icon: cat.icon,
              color_preset: cat.color_preset,
              scope: cat.scope,
              display_order: cat.display_order
            })
            .select()
            .single();
          
          if (!error && newCat) {
            categoryMap.set(cat.id, newCat.id);
          }
        }

        if (data.sections && Array.isArray(data.sections)) {
          for (const section of data.sections) {
            const newCategoryId = categoryMap.get(section.category_id);
            if (newCategoryId) {
              await supabase.from('sections').insert({
                category_id: newCategoryId,
                title: section.title,
                content: section.content,
                display_order: section.display_order
              });
            }
          }
        }
      }

      toast.success('Données importées avec succès !');
      setImportData('');
    } catch (error) {
      console.error('Erreur import:', error);
      toast.error('Erreur lors de l\'import: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sauvegarde et Restauration</h1>
        <p className="text-muted-foreground">
          Exportez et importez vos données pour les sauvegarder
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exporter les données
            </CardTitle>
            <CardDescription>
              Téléchargez une copie de vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleExportFromLocalStorage} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export depuis localStorage
              </Button>
              <Button onClick={handleExportFromSupabase} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                Export depuis Supabase
              </Button>
            </div>
            
            {exportData && (
              <Textarea
                value={exportData}
                readOnly
                className="font-mono text-xs h-40"
                placeholder="Les données exportées apparaîtront ici..."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importer les données
            </CardTitle>
            <CardDescription className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span>Attention: ceci va remplacer TOUTES les données existantes dans Supabase</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="font-mono text-xs h-40"
              placeholder="Collez ici les données JSON à importer..."
            />
            <Button 
              onClick={handleImportToSupabase} 
              disabled={loading || !importData.trim()}
              variant="destructive"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer vers Supabase
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-orange-900">
            <p><strong>Pour sauvegarder vos données en ligne:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Allez sur https://www.helpconfort.services/</li>
              <li>Connectez-vous en tant qu'admin</li>
              <li>Allez sur cette même page (/data-backup)</li>
              <li>Cliquez sur "Export depuis localStorage"</li>
              <li>Le fichier JSON sera téléchargé automatiquement</li>
              <li>Gardez ce fichier en sécurité !</li>
            </ol>
            <p className="mt-4"><strong>Pour restaurer après publication:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Ouvrez le fichier JSON sauvegardé</li>
              <li>Copiez tout son contenu</li>
              <li>Collez-le dans la zone "Importer les données"</li>
              <li>Cliquez sur "Importer vers Supabase"</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
