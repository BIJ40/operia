import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Database, AlertCircle, CheckCircle2, FileJson, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminBackup() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [exportingApogee, setExportingApogee] = useState(false);
  const [exportingApporteur, setExportingApporteur] = useState(false);
  const [apogeeCategories, setApogeeCategories] = useState<any[]>([]);
  const [apporteurCategories, setApporteurCategories] = useState<any[]>([]);
  const [selectedApogeeCategory, setSelectedApogeeCategory] = useState<string>('');
  const [selectedApporteurCategory, setSelectedApporteurCategory] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [apogeeResult, apporteurResult] = await Promise.all([
        supabase.from('blocks').select('id, title').eq('type', 'category').order('order'),
        supabase.from('apporteur_blocks').select('id, title').eq('type', 'category').order('order'),
      ]);

      if (apogeeResult.data) setApogeeCategories(apogeeResult.data);
      if (apporteurResult.data) setApporteurCategories(apporteurResult.data);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

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

  // Fonction pour extraire le texte pur sans HTML
  const extractPlainText = (html: string): string => {
    if (!html) return '';
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Fonction pour nettoyer le HTML et le rendre lisible
  const cleanHtmlForExport = (html: string): string => {
    if (!html) return '';
    
    // Créer un élément temporaire pour parser le HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Fonction récursive pour nettoyer les attributs
    const cleanElement = (element: Element) => {
      // Garder uniquement les attributs essentiels
      const attributesToKeep = ['href', 'src', 'alt', 'title'];
      const attributes = Array.from(element.attributes);
      
      attributes.forEach(attr => {
        if (!attributesToKeep.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
      
      // Nettoyer les enfants
      Array.from(element.children).forEach(child => cleanElement(child));
    };
    
    cleanElement(temp);
    
    // Retourner le HTML nettoyé avec indentation
    return temp.innerHTML
      .replace(/></g, '>\n<')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  };

  const exportApogeeData = async () => {
    setExportingApogee(true);
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      // Organiser par catégories
      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apogee',
        categories: categories.map(cat => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          colorPreset: cat.color_preset,
          order: cat.order,
          sections: sections
            .filter(s => s.parent_id === cat.id)
            .map(s => ({
              id: s.id,
              title: s.title,
              slug: s.slug,
              contentText: extractPlainText(s.content), // Texte pur sans HTML
              contentHtml: cleanHtmlForExport(s.content),
              contentRaw: s.content, // Garder aussi le HTML brut pour réimport
              summary: s.summary,
              showSummary: s.show_summary,
              icon: s.icon,
              colorPreset: s.color_preset,
              order: s.order,
              contentType: s.content_type,
              tipsType: s.tips_type,
              hideFromSidebar: s.hide_from_sidebar,
            }))
            .sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order),
        stats: {
          totalCategories: categories.length,
          totalSections: sections.length,
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-apogee-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Apogée réussi !',
        description: `${exportData.stats.totalCategories} catégories, ${exportData.stats.totalSections} sections exportées`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Impossible d\'exporter les données Apogée',
        variant: 'destructive',
      });
    } finally {
      setExportingApogee(false);
    }
  };

  const exportApporteurData = async () => {
    setExportingApporteur(true);
    try {
      const { data: blocks, error } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apporteur',
        categories: categories.map(cat => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          colorPreset: cat.color_preset,
          order: cat.order,
          isSingleSection: cat.is_single_section,
          showTitleInMenu: cat.show_title_in_menu,
          showTitleOnCard: cat.show_title_on_card,
          sections: sections
            .filter(s => s.parent_id === cat.id)
            .map(s => ({
              id: s.id,
              title: s.title,
              slug: s.slug,
              contentText: extractPlainText(s.content), // Texte pur sans HTML
              contentHtml: cleanHtmlForExport(s.content),
              contentRaw: s.content, // Garder aussi le HTML brut pour réimport
              summary: s.summary,
              showSummary: s.show_summary,
              icon: s.icon,
              colorPreset: s.color_preset,
              order: s.order,
              contentType: s.content_type,
              tipsType: s.tips_type,
              hideFromSidebar: s.hide_from_sidebar,
            }))
            .sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order),
        stats: {
          totalCategories: categories.length,
          totalSections: sections.length,
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-apporteur-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Apporteur réussi !',
        description: `${exportData.stats.totalCategories} catégories, ${exportData.stats.totalSections} sections exportées`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter les données Apporteur',
        variant: 'destructive',
      });
    } finally {
      setExportingApporteur(false);
    }
  };

  const exportApogeeTextOnly = async () => {
    setExportingApogee(true);
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      let textContent = `MANUEL APOGÉE - Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
      textContent += '='.repeat(70) + '\n\n';

      categories.forEach(cat => {
        textContent += `\n${'#'.repeat(70)}\n`;
        textContent += `CATÉGORIE: ${cat.title.toUpperCase()}\n`;
        textContent += `${'#'.repeat(70)}\n\n`;

        const catSections = sections
          .filter(s => s.parent_id === cat.id)
          .sort((a, b) => a.order - b.order);

        catSections.forEach(section => {
          textContent += `\n${'-'.repeat(60)}\n`;
          textContent += `SECTION: ${section.title}\n`;
          textContent += `${'-'.repeat(60)}\n\n`;
          textContent += extractPlainText(section.content);
          textContent += '\n\n';
        });
      });

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-apogee-texte-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export texte Apogée réussi !',
        description: `${categories.length} catégories exportées en texte brut`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter le texte Apogée',
        variant: 'destructive',
      });
    } finally {
      setExportingApogee(false);
    }
  };

  const exportApporteurTextOnly = async () => {
    setExportingApporteur(true);
    try {
      const { data: blocks, error } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .order('order');

      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      let textContent = `GUIDE APPORTEUR - Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
      textContent += '='.repeat(70) + '\n\n';

      categories.forEach(cat => {
        textContent += `\n${'#'.repeat(70)}\n`;
        textContent += `CATÉGORIE: ${cat.title.toUpperCase()}\n`;
        textContent += `${'#'.repeat(70)}\n\n`;

        const catSections = sections
          .filter(s => s.parent_id === cat.id)
          .sort((a, b) => a.order - b.order);

        catSections.forEach(section => {
          textContent += `\n${'-'.repeat(60)}\n`;
          textContent += `SECTION: ${section.title}\n`;
          textContent += `${'-'.repeat(60)}\n\n`;
          textContent += extractPlainText(section.content);
          textContent += '\n\n';
        });
      });

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-apporteur-texte-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export texte Apporteur réussi !',
        description: `${categories.length} catégories exportées en texte brut`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: 'Impossible d\'exporter le texte Apporteur',
        variant: 'destructive',
      });
    } finally {
      setExportingApporteur(false);
    }
  };

  const exportSingleApogeeCategory = async (format: 'json' | 'txt') => {
    if (!selectedApogeeCategory) {
      toast({
        title: 'Aucune catégorie sélectionnée',
        description: 'Veuillez sélectionner une catégorie',
        variant: 'destructive',
      });
      return;
    }

    setExportingApogee(true);
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('*')
        .or(`id.eq.${selectedApogeeCategory},parent_id.eq.${selectedApogeeCategory}`)
        .order('order');

      if (error) throw error;

      const category = blocks?.find(b => b.id === selectedApogeeCategory);
      const sections = blocks?.filter(b => b.parent_id === selectedApogeeCategory) || [];

      if (!category) {
        throw new Error('Catégorie non trouvée');
      }

      if (format === 'txt') {
        let textContent = `MANUEL APOGÉE - ${category.title.toUpperCase()}\n`;
        textContent += `Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
        textContent += '='.repeat(70) + '\n\n';

        sections.sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\n`;
          textContent += `SECTION: ${section.title}\n`;
          textContent += `${'-'.repeat(60)}\n\n`;
          textContent += extractPlainText(section.content);
          textContent += '\n\n';
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-apogee-${category.slug}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          type: 'apogee-single-category',
          category: {
            id: category.id,
            title: category.title,
            slug: category.slug,
            icon: category.icon,
            colorPreset: category.color_preset,
            order: category.order,
            sections: sections
              .map(s => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                contentText: extractPlainText(s.content),
                contentHtml: cleanHtmlForExport(s.content),
                contentRaw: s.content,
                summary: s.summary,
                showSummary: s.show_summary,
                icon: s.icon,
                colorPreset: s.color_preset,
                order: s.order,
                contentType: s.content_type,
                tipsType: s.tips_type,
                hideFromSidebar: s.hide_from_sidebar,
              }))
              .sort((a, b) => a.order - b.order)
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-apogee-${category.slug}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: `Export ${format.toUpperCase()} réussi !`,
        description: `Catégorie "${category.title}" avec ${sections.length} sections exportée`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : 'Impossible d\'exporter la catégorie',
        variant: 'destructive',
      });
    } finally {
      setExportingApogee(false);
    }
  };

  const exportSingleApporteurCategory = async (format: 'json' | 'txt') => {
    if (!selectedApporteurCategory) {
      toast({
        title: 'Aucune catégorie sélectionnée',
        description: 'Veuillez sélectionner une catégorie',
        variant: 'destructive',
      });
      return;
    }

    setExportingApporteur(true);
    try {
      const { data: blocks, error } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .or(`id.eq.${selectedApporteurCategory},parent_id.eq.${selectedApporteurCategory}`)
        .order('order');

      if (error) throw error;

      const category = blocks?.find(b => b.id === selectedApporteurCategory);
      const sections = blocks?.filter(b => b.parent_id === selectedApporteurCategory) || [];

      if (!category) {
        throw new Error('Catégorie non trouvée');
      }

      if (format === 'txt') {
        let textContent = `GUIDE APPORTEUR - ${category.title.toUpperCase()}\n`;
        textContent += `Export du ${new Date().toLocaleDateString('fr-FR')}\n`;
        textContent += '='.repeat(70) + '\n\n';

        sections.sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\n`;
          textContent += `SECTION: ${section.title}\n`;
          textContent += `${'-'.repeat(60)}\n\n`;
          textContent += extractPlainText(section.content);
          textContent += '\n\n';
        });

        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-apporteur-${category.slug}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          type: 'apporteur-single-category',
          category: {
            id: category.id,
            title: category.title,
            slug: category.slug,
            icon: category.icon,
            colorPreset: category.color_preset,
            order: category.order,
            isSingleSection: category.is_single_section,
            showTitleInMenu: category.show_title_in_menu,
            showTitleOnCard: category.show_title_on_card,
            sections: sections
              .map(s => ({
                id: s.id,
                title: s.title,
                slug: s.slug,
                contentText: extractPlainText(s.content),
                contentHtml: cleanHtmlForExport(s.content),
                contentRaw: s.content,
                summary: s.summary,
                showSummary: s.show_summary,
                icon: s.icon,
                colorPreset: s.color_preset,
                order: s.order,
                contentType: s.content_type,
                tipsType: s.tips_type,
                hideFromSidebar: s.hide_from_sidebar,
              }))
              .sort((a, b) => a.order - b.order)
          }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export-apporteur-${category.slug}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: `Export ${format.toUpperCase()} réussi !`,
        description: `Catégorie "${category.title}" avec ${sections.length} sections exportée`,
      });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : 'Impossible d\'exporter la catégorie',
        variant: 'destructive',
      });
    } finally {
      setExportingApporteur(false);
    }
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
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

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-helpogee-complet-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastBackup(new Date());
      toast({
        title: 'Export complet réussi !',
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
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Database className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Sauvegarde & Restauration</h1>
      </div>

      {lastBackup && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Dernière sauvegarde complète : {lastBackup.toLocaleString('fr-FR')}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="structured" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structured">Export Complet</TabsTrigger>
          <TabsTrigger value="single">Export Catégorie</TabsTrigger>
          <TabsTrigger value="complete">Sauvegarde Complète</TabsTrigger>
        </TabsList>

        {/* Export Structuré */}
        <TabsContent value="structured" className="space-y-6">
          <Alert>
            <FileJson className="h-4 w-4" />
            <AlertDescription>
              Export lisible et structuré par catégories et sections. Format JSON facile à lire et éditer.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Manuel Apogée
                </CardTitle>
                <CardDescription>
                  Export des catégories et sections du guide Apogée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={exportApogeeData}
                  disabled={exportingApogee}
                  className="w-full"
                  size="lg"
                >
                  {exportingApogee ? 'Export en cours...' : 'Exporter JSON'}
                </Button>
                <Button 
                  onClick={exportApogeeTextOnly}
                  disabled={exportingApogee}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {exportingApogee ? 'Export en cours...' : 'Exporter Texte (.txt)'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Guide Apporteur
                </CardTitle>
                <CardDescription>
                  Export des catégories et sections du guide Apporteur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={exportApporteurData}
                  disabled={exportingApporteur}
                  className="w-full"
                  size="lg"
                >
                  {exportingApporteur ? 'Export en cours...' : 'Exporter JSON'}
                </Button>
                <Button 
                  onClick={exportApporteurTextOnly}
                  disabled={exportingApporteur}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {exportingApporteur ? 'Export en cours...' : 'Exporter Texte (.txt)'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export Catégorie Unique */}
        <TabsContent value="single" className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Exportez une seule catégorie avec toutes ses sections en JSON ou texte brut.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Catégorie Apogée
                </CardTitle>
                <CardDescription>
                  Sélectionnez une catégorie du guide Apogée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedApogeeCategory} onValueChange={setSelectedApogeeCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {apogeeCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportSingleApogeeCategory('json')}
                    disabled={!selectedApogeeCategory || exportingApogee}
                    className="flex-1"
                    size="sm"
                  >
                    JSON
                  </Button>
                  <Button 
                    onClick={() => exportSingleApogeeCategory('txt')}
                    disabled={!selectedApogeeCategory || exportingApogee}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                  >
                    Texte
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Catégorie Apporteur
                </CardTitle>
                <CardDescription>
                  Sélectionnez une catégorie du guide Apporteur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedApporteurCategory} onValueChange={setSelectedApporteurCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {apporteurCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportSingleApporteurCategory('json')}
                    disabled={!selectedApporteurCategory || exportingApporteur}
                    className="flex-1"
                    size="sm"
                  >
                    JSON
                  </Button>
                  <Button 
                    onClick={() => exportSingleApporteurCategory('txt')}
                    disabled={!selectedApporteurCategory || exportingApporteur}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                  >
                    Texte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sauvegarde Complète */}
        <TabsContent value="complete" className="space-y-6">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Sauvegarde technique complète incluant tous les champs de la base de données (blocks, documents, etc.)
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exporter toutes les données
                </CardTitle>
                <CardDescription>
                  Sauvegarde complète (format technique)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={exportAllData}
                  disabled={exporting}
                  className="w-full"
                  size="lg"
                >
                  {exporting ? 'Export en cours...' : 'Télécharger la sauvegarde'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restaurer les données
                </CardTitle>
                <CardDescription>
                  Importer un fichier de sauvegarde complète
                </CardDescription>
              </CardHeader>
              <CardContent>
                <label htmlFor="import-file">
                  <Button 
                    disabled={importing}
                    className="w-full"
                    size="lg"
                    asChild
                  >
                    <span>
                      {importing ? 'Import en cours...' : 'Choisir un fichier'}
                    </span>
                  </Button>
                  <input
                    id="import-file"
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> L'import écrasera toutes les données actuelles. 
              Assurez-vous d'avoir une sauvegarde récente avant de continuer.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Export Structuré vs Sauvegarde Complète</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong>Export Structuré :</strong> Format JSON lisible organisé par catégories et sections. Idéal pour l'édition manuelle ou la consultation du contenu.</li>
              <li><strong>Sauvegarde Complète :</strong> Format technique incluant tous les champs de la base de données. À utiliser pour les restaurations complètes du système.</li>
            </ul>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Bonnes pratiques :</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Exportez régulièrement vos données</li>
              <li>✓ Conservez plusieurs sauvegardes à différentes dates</li>
              <li>✓ Utilisez l'export structuré pour consulter ou éditer le contenu</li>
              <li>✓ Utilisez la sauvegarde complète pour les restaurations système</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
