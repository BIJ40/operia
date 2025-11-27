import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CategoryBlock {
  id: string;
  title: string;
  slug?: string;
  order?: number;
}

export const useAdminBackup = () => {
  const { toast } = useToast();
  const [apogeeCategories, setApogeeCategories] = useState<CategoryBlock[]>([]);
  const [apporteurCategories, setApporteurCategories] = useState<CategoryBlock[]>([]);
  const [selectedApogeeCategory, setSelectedApogeeCategory] = useState<string>('');
  const [selectedApporteurCategory, setSelectedApporteurCategory] = useState<string>('');
  const [exportingApogee, setExportingApogee] = useState(false);
  const [exportingApporteur, setExportingApporteur] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [apogeeResult, apporteurResult] = await Promise.all([
        supabase.from('blocks').select('id, title, slug, order').eq('type', 'category').order('order'),
        supabase.from('apporteur_blocks').select('id, title, slug, order').eq('type', 'category').order('order'),
      ]);

      if (apogeeResult.data) setApogeeCategories(apogeeResult.data);
      if (apporteurResult.data) setApporteurCategories(apporteurResult.data);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const extractPlainText = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const cleanHtmlForExport = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const cleanElement = (element: Element) => {
      const attributesToKeep = ['href', 'src', 'alt', 'title'];
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        if (!attributesToKeep.includes(attr.name)) {
          element.removeAttribute(attr.name);
        }
      });
      Array.from(element.children).forEach(child => cleanElement(child));
    };
    
    cleanElement(temp);
    return temp.innerHTML.replace(/></g, '>\n<').replace(/\n\s*\n/g, '\n').trim();
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportApogeeData = async () => {
    setExportingApogee(true);
    try {
      const { data: blocks, error } = await supabase.from('blocks').select('*').order('order');
      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apogee',
        categories: categories.map(cat => ({
          id: cat.id, title: cat.title, slug: cat.slug, icon: cat.icon,
          colorPreset: cat.color_preset, order: cat.order,
          sections: sections.filter(s => s.parent_id === cat.id).map(s => ({
            id: s.id, title: s.title, slug: s.slug,
            contentText: extractPlainText(s.content),
            contentHtml: cleanHtmlForExport(s.content),
            contentRaw: s.content, summary: s.summary, showSummary: s.show_summary,
            icon: s.icon, colorPreset: s.color_preset, order: s.order,
            contentType: s.content_type, tipsType: s.tips_type, hideFromSidebar: s.hide_from_sidebar,
          })).sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order),
        stats: { totalCategories: categories.length, totalSections: sections.length }
      };

      downloadFile(JSON.stringify(exportData, null, 2), `export-apogee-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      toast({ title: 'Export Apogée réussi !', description: `${categories.length} catégories, ${sections.length} sections` });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({ title: "Erreur d'export", description: 'Impossible d\'exporter les données Apogée', variant: 'destructive' });
    } finally {
      setExportingApogee(false);
    }
  };

  const exportApporteurData = async () => {
    setExportingApporteur(true);
    try {
      const { data: blocks, error } = await supabase.from('apporteur_blocks').select('*').order('order');
      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        type: 'apporteur',
        categories: categories.map(cat => ({
          id: cat.id, title: cat.title, slug: cat.slug, icon: cat.icon,
          colorPreset: cat.color_preset, order: cat.order,
          isSingleSection: cat.is_single_section, showTitleInMenu: cat.show_title_in_menu, showTitleOnCard: cat.show_title_on_card,
          sections: sections.filter(s => s.parent_id === cat.id).map(s => ({
            id: s.id, title: s.title, slug: s.slug,
            contentText: extractPlainText(s.content),
            contentHtml: cleanHtmlForExport(s.content),
            contentRaw: s.content, summary: s.summary, showSummary: s.show_summary,
            icon: s.icon, colorPreset: s.color_preset, order: s.order,
            contentType: s.content_type, tipsType: s.tips_type, hideFromSidebar: s.hide_from_sidebar,
          })).sort((a, b) => a.order - b.order)
        })).sort((a, b) => a.order - b.order),
        stats: { totalCategories: categories.length, totalSections: sections.length }
      };

      downloadFile(JSON.stringify(exportData, null, 2), `export-apporteur-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      toast({ title: 'Export Apporteur réussi !', description: `${categories.length} catégories, ${sections.length} sections` });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({ title: "Erreur d'export", description: 'Impossible d\'exporter les données Apporteur', variant: 'destructive' });
    } finally {
      setExportingApporteur(false);
    }
  };

  const exportTextOnly = async (scope: 'apogee' | 'apporteur') => {
    const setLoading = scope === 'apogee' ? setExportingApogee : setExportingApporteur;
    const tableName = scope === 'apogee' ? 'blocks' : 'apporteur_blocks';
    const title = scope === 'apogee' ? 'MANUEL APOGÉE' : 'GUIDE APPORTEUR';
    
    setLoading(true);
    try {
      const { data: blocks, error } = await supabase.from(tableName).select('*').order('order');
      if (error) throw error;

      const categories = blocks?.filter(b => b.type === 'category') || [];
      const sections = blocks?.filter(b => b.type === 'section') || [];

      let textContent = `${title} - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;

      categories.forEach(cat => {
        textContent += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        sections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      downloadFile(textContent, `export-${scope}-texte-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain;charset=utf-8');
      toast({ title: `Export texte ${scope === 'apogee' ? 'Apogée' : 'Apporteur'} réussi !`, description: `${categories.length} catégories exportées` });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({ title: "Erreur d'export", variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportSingleCategory = async (scope: 'apogee' | 'apporteur', format: 'json' | 'txt') => {
    const categoryId = scope === 'apogee' ? selectedApogeeCategory : selectedApporteurCategory;
    const setLoading = scope === 'apogee' ? setExportingApogee : setExportingApporteur;
    const tableName = scope === 'apogee' ? 'blocks' : 'apporteur_blocks';
    const guideTitle = scope === 'apogee' ? 'MANUEL APOGÉE' : 'GUIDE APPORTEUR';

    if (!categoryId) {
      toast({ title: 'Aucune catégorie sélectionnée', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: blocks, error } = await supabase.from(tableName).select('*')
        .or(`id.eq.${categoryId},parent_id.eq.${categoryId}`).order('order');
      if (error) throw error;

      const category = blocks?.find(b => b.id === categoryId);
      const sections = blocks?.filter(b => b.parent_id === categoryId) || [];
      if (!category) throw new Error('Catégorie non trouvée');

      if (format === 'txt') {
        let textContent = `${guideTitle} - ${category.title.toUpperCase()}\nExport du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
        sections.sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
        downloadFile(textContent, `export-${scope}-${category.slug}-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain;charset=utf-8');
      } else {
        const catAny = category as any;
        const exportData = {
          version: '1.0', exportDate: new Date().toISOString(), type: `${scope}-single-category`,
          category: {
            id: category.id, title: category.title, slug: category.slug, icon: category.icon,
            colorPreset: category.color_preset, order: category.order,
            ...(scope === 'apporteur' && { isSingleSection: catAny.is_single_section, showTitleInMenu: catAny.show_title_in_menu, showTitleOnCard: catAny.show_title_on_card }),
            sections: sections.map(s => ({
              id: s.id, title: s.title, slug: s.slug,
              contentText: extractPlainText(s.content), contentHtml: cleanHtmlForExport(s.content), contentRaw: s.content,
              summary: s.summary, showSummary: s.show_summary, icon: s.icon, colorPreset: s.color_preset, order: s.order,
              contentType: s.content_type, tipsType: s.tips_type, hideFromSidebar: s.hide_from_sidebar,
            })).sort((a, b) => a.order - b.order)
          }
        };
        downloadFile(JSON.stringify(exportData, null, 2), `export-${scope}-${category.slug}-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      }

      toast({ title: `Export ${format.toUpperCase()} réussi !`, description: `"${category.title}" avec ${sections.length} sections` });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({ title: "Erreur d'export", description: error instanceof Error ? error.message : 'Erreur', variant: 'destructive' });
    } finally {
      setLoading(false);
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

      if (blocksResult.error || apporteurBlocksResult.error || documentsResult.error || categoriesResult.error || sectionsResult.error) {
        throw blocksResult.error || apporteurBlocksResult.error || documentsResult.error || categoriesResult.error || sectionsResult.error;
      }

      const backupData = {
        version: '1.0', exportDate: new Date().toISOString(),
        data: {
          blocks: blocksResult.data || [], apporteur_blocks: apporteurBlocksResult.data || [],
          documents: documentsResult.data || [], categories: categoriesResult.data || [], sections: sectionsResult.data || [],
        },
        stats: {
          totalBlocks: (blocksResult.data?.length || 0) + (apporteurBlocksResult.data?.length || 0),
          totalDocuments: documentsResult.data?.length || 0, totalCategories: categoriesResult.data?.length || 0, totalSections: sectionsResult.data?.length || 0,
        }
      };

      downloadFile(JSON.stringify(backupData, null, 2), `backup-helpogee-complet-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      setLastBackup(new Date());
      toast({ title: 'Export complet réussi !', description: `${backupData.stats.totalBlocks} blocs, ${backupData.stats.totalDocuments} documents` });
    } catch (error) {
      console.error('Erreur export:', error);
      toast({ title: "Erreur d'export", variant: 'destructive' });
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
      if (!backupData.data) throw new Error('Format de fichier invalide');

      if (!confirm(`⚠️ ATTENTION: Cette opération va ÉCRASER toutes les données actuelles.\n\nVoulez-vous vraiment continuer ?\n\nDonnées à importer:\n- ${backupData.stats?.totalBlocks || 0} blocs\n- ${backupData.stats?.totalDocuments || 0} documents`)) {
        setImporting(false);
        return;
      }

      await Promise.all([
        supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('apporteur_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      const insertPromises = [];
      if (backupData.data.blocks?.length > 0) insertPromises.push(supabase.from('blocks').insert(backupData.data.blocks));
      if (backupData.data.apporteur_blocks?.length > 0) insertPromises.push(supabase.from('apporteur_blocks').insert(backupData.data.apporteur_blocks));
      await Promise.all(insertPromises);

      toast({ title: 'Import réussi !', description: 'Les données ont été restaurées. Rechargez la page.' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Erreur import:', error);
      toast({ title: "Erreur d'import", description: error instanceof Error ? error.message : 'Fichier invalide', variant: 'destructive' });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return {
    apogeeCategories, apporteurCategories,
    selectedApogeeCategory, selectedApporteurCategory,
    setSelectedApogeeCategory, setSelectedApporteurCategory,
    exportingApogee, exportingApporteur, exporting, importing, lastBackup,
    exportApogeeData, exportApporteurData, exportTextOnly, exportSingleCategory, exportAllData, importData,
  };
};
