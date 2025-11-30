import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';

interface CategoryBlock {
  id: string;
  title: string;
  slug?: string;
  order?: number;
}

export const useAdminBackup = () => {
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
    const [apogeeResult, apporteurResult] = await Promise.all([
      safeQuery<CategoryBlock[]>(
        supabase.from('blocks').select('id, title, slug, order').eq('type', 'category').order('order'),
        'BACKUP_APOGEE_CATEGORIES_LOAD'
      ),
      safeQuery<CategoryBlock[]>(
        supabase.from('apporteur_blocks').select('id, title, slug, order').eq('type', 'category').order('order'),
        'BACKUP_APPORTEUR_CATEGORIES_LOAD'
      ),
    ]);

    if (apogeeResult.data) setApogeeCategories(apogeeResult.data);
    if (apporteurResult.data) setApporteurCategories(apporteurResult.data);
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
      const result = await safeQuery<any[]>(
        supabase.from('blocks').select('*').order('order'),
        'BACKUP_EXPORT_APOGEE'
      );

      if (!result.success || !result.data) {
        errorToast('Impossible d\'exporter les données Apogée');
        return;
      }

      const blocks = result.data;
      const categories = blocks.filter(b => b.type === 'category') || [];
      const sections = blocks.filter(b => b.type === 'section') || [];

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
      successToast('Export Apogée réussi !', `${categories.length} catégories, ${sections.length} sections`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export Apogée', error);
      errorToast('Impossible d\'exporter les données Apogée');
    } finally {
      setExportingApogee(false);
    }
  };

  const exportApporteurData = async () => {
    setExportingApporteur(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from('apporteur_blocks').select('*').order('order'),
        'BACKUP_EXPORT_APPORTEUR'
      );

      if (!result.success || !result.data) {
        errorToast('Impossible d\'exporter les données Apporteur');
        return;
      }

      const blocks = result.data;
      const categories = blocks.filter(b => b.type === 'category') || [];
      const sections = blocks.filter(b => b.type === 'section') || [];

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
      successToast('Export Apporteur réussi !', `${categories.length} catégories, ${sections.length} sections`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export Apporteur', error);
      errorToast('Impossible d\'exporter les données Apporteur');
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
      const result = await safeQuery<any[]>(
        supabase.from(tableName).select('*').order('order'),
        `BACKUP_EXPORT_TEXT_${scope.toUpperCase()}`
      );

      if (!result.success || !result.data) {
        errorToast("Erreur d'export");
        return;
      }

      const blocks = result.data;
      const categories = blocks.filter(b => b.type === 'category') || [];
      const sections = blocks.filter(b => b.type === 'section') || [];

      let textContent = `${title} - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;

      categories.forEach(cat => {
        textContent += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        sections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      downloadFile(textContent, `export-${scope}-texte-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain;charset=utf-8');
      successToast(`Export texte ${scope === 'apogee' ? 'Apogée' : 'Apporteur'} réussi !`, `${categories.length} catégories exportées`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export texte ${scope}`, error);
      errorToast("Erreur d'export");
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
      errorToast('Aucune catégorie sélectionnée');
      return;
    }

    setLoading(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from(tableName).select('*').or(`id.eq.${categoryId},parent_id.eq.${categoryId}`).order('order'),
        `BACKUP_EXPORT_SINGLE_${scope.toUpperCase()}`
      );

      if (!result.success || !result.data) {
        errorToast("Erreur d'export");
        return;
      }

      const blocks = result.data;
      const category = blocks.find(b => b.id === categoryId);
      const sections = blocks.filter(b => b.parent_id === categoryId) || [];
      
      if (!category) {
        errorToast('Catégorie non trouvée');
        return;
      }

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

      successToast(`Export ${format.toUpperCase()} réussi !`, `"${category.title}" avec ${sections.length} sections`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export single ${scope}`, error);
      errorToast("Erreur d'export");
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
      const [blocksResult, apporteurBlocksResult, documentsResult, categoriesResult, sectionsResult] = await Promise.all([
        safeQuery<any[]>(supabase.from('blocks').select('*').order('order'), 'BACKUP_EXPORT_ALL_BLOCKS'),
        safeQuery<any[]>(supabase.from('apporteur_blocks').select('*').order('order'), 'BACKUP_EXPORT_ALL_APPORTEUR'),
        safeQuery<any[]>(supabase.from('documents').select('*'), 'BACKUP_EXPORT_ALL_DOCUMENTS'),
        safeQuery<any[]>(supabase.from('categories').select('*'), 'BACKUP_EXPORT_ALL_CATEGORIES'),
        safeQuery<any[]>(supabase.from('sections').select('*'), 'BACKUP_EXPORT_ALL_SECTIONS'),
      ]);

      if (!blocksResult.success || !apporteurBlocksResult.success || !documentsResult.success || !categoriesResult.success || !sectionsResult.success) {
        errorToast("Erreur d'export");
        return;
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
      successToast('Export complet réussi !', `${backupData.stats.totalBlocks} blocs, ${backupData.stats.totalDocuments} documents`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export complet', error);
      errorToast("Erreur d'export");
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
        errorToast('Format de fichier invalide');
        return;
      }

      if (!confirm(`⚠️ ATTENTION: Cette opération va ÉCRASER toutes les données actuelles.\n\nVoulez-vous vraiment continuer ?\n\nDonnées à importer:\n- ${backupData.stats?.totalBlocks || 0} blocs\n- ${backupData.stats?.totalDocuments || 0} documents`)) {
        setImporting(false);
        return;
      }

      // Supprimer les anciennes données
      await Promise.all([
        safeMutation(
          supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          'BACKUP_IMPORT_DELETE_BLOCKS'
        ),
        safeMutation(
          supabase.from('apporteur_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
          'BACKUP_IMPORT_DELETE_APPORTEUR'
        ),
      ]);

      // Insérer les nouvelles données
      const insertPromises = [];
      if (backupData.data.blocks?.length > 0) {
        insertPromises.push(
          safeMutation(supabase.from('blocks').insert(backupData.data.blocks), 'BACKUP_IMPORT_INSERT_BLOCKS')
        );
      }
      if (backupData.data.apporteur_blocks?.length > 0) {
        insertPromises.push(
          safeMutation(supabase.from('apporteur_blocks').insert(backupData.data.apporteur_blocks), 'BACKUP_IMPORT_INSERT_APPORTEUR')
        );
      }
      await Promise.all(insertPromises);

      successToast('Import réussi !', 'Les données ont été restaurées. Rechargez la page.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      logError('use-admin-backup', 'Erreur import', error);
      errorToast(error instanceof Error ? error.message : 'Fichier invalide');
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
