import { useState, useEffect } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, AlertCircle } from 'lucide-react';
import { Block } from '@/types/block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate } from 'react-router-dom';
import { logError } from '@/lib/logger';

export default function AdminHelpConfortBackup() {
  const { hasGlobalRole } = usePermissions();
  const canAccess = hasGlobalRole('platform_admin');
  const { toast } = useToast();
  const [categories, setCategories] = useState<Block[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('type', 'category')
      .ilike('slug', 'helpconfort-%')
      .order('order');

    if (error) {
      logError('BACKUP_HELPCONFORT', 'Erreur chargement catégories', { error });
      return;
    }

    const mappedData = (data || []).map(block => ({
      ...block,
      colorPreset: block.color_preset as any,
      parentId: block.parent_id,
      hideFromSidebar: block.hide_from_sidebar,
      contentType: block.content_type as any,
      tipsType: block.tips_type as any,
      showSummary: block.show_summary,
      hideTitle: block.hide_title,
      attachments: block.attachments as any || []
    }));

    setCategories(mappedData as Block[]);
  };

  const exportAllHelpConfortData = async () => {
    setIsExporting(true);
    try {
      const { data: allBlocks, error } = await supabase
        .from('blocks')
        .select('*')
        .ilike('slug', 'helpconfort-%')
        .order('order');

      if (error) throw error;

      const exportData = {
        blocks: allBlocks || [],
        exportDate: new Date().toISOString(),
        scope: 'helpconfort',
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `helpconfort-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: 'Toutes les données HelpConfort ont été exportées',
      });
    } catch (error) {
      logError('BACKUP_HELPCONFORT', 'Erreur export complet', { error });
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export des données',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportSingleCategory = async () => {
    if (!selectedCategory) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une catégorie',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const { data: sections, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('parent_id', selectedCategory)
        .order('order');

      if (error) throw error;

      const category = categories.find(c => c.id === selectedCategory);
      const exportData = {
        category: category,
        sections: sections || [],
        exportDate: new Date().toISOString(),
        scope: 'helpconfort',
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `helpconfort-${category?.slug}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export réussi',
        description: `La catégorie "${category?.title}" a été exportée`,
      });
    } catch (error) {
      logError('BACKUP_HELPCONFORT', 'Erreur export catégorie', { error });
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export de la catégorie',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.scope !== 'helpconfort') {
        throw new Error('Ce fichier ne contient pas de données HelpConfort');
      }

      if (data.category && data.sections) {
        // Import d'une seule catégorie
        const { error: categoryError } = await supabase
          .from('blocks')
          .upsert([data.category]);

        if (categoryError) throw categoryError;

        const { error: sectionsError } = await supabase
          .from('blocks')
          .upsert(data.sections);

        if (sectionsError) throw sectionsError;

        toast({
          title: 'Import réussi',
          description: `La catégorie "${data.category.title}" et ses sections ont été importées`,
        });
      } else if (data.blocks) {
        // Import complet
        const { error } = await supabase
          .from('blocks')
          .upsert(data.blocks);

        if (error) throw error;

        toast({
          title: 'Import réussi',
          description: 'Toutes les données HelpConfort ont été importées',
        });
      }

      loadCategories();
    } catch (error) {
      logError('BACKUP_HELPCONFORT', 'Erreur import', { error });
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'import des données',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Sauvegarde HelpConfort</h1>

      <Tabs defaultValue="full" className="space-y-4">
        <TabsList>
          <TabsTrigger value="full">Export complet</TabsTrigger>
          <TabsTrigger value="single">Export par catégorie</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        <TabsContent value="full">
          <Card>
            <CardHeader>
              <CardTitle>Export complet HelpConfort</CardTitle>
              <CardDescription>
                Exporter toutes les catégories et sections HelpConfort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportAllHelpConfortData} 
                disabled={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Export en cours...' : 'Exporter toutes les données'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Export d'une catégorie</CardTitle>
              <CardDescription>
                Exporter une catégorie spécifique avec toutes ses sections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={exportSingleCategory} 
                disabled={isExporting || !selectedCategory}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Export en cours...' : 'Exporter cette catégorie'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import de données</CardTitle>
              <CardDescription>
                Importer des catégories et sections depuis un fichier de sauvegarde
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  L'import fusionnera les données avec les données existantes. 
                  Les éléments avec le même ID seront mis à jour.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  disabled={isImporting}
                  className="hidden"
                  id="import-file"
                />
                <Button 
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={isImporting}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Import en cours...' : 'Choisir un fichier à importer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
