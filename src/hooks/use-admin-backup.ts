import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { extractPlainText, cleanHtmlForExport, downloadFile, todayISO } from '@/lib/backup-helpers';
import { createPdfContext, renderTitlePage, renderSectionsToPdf } from '@/lib/backup-pdf-renderer';
// jsPDF loaded dynamically to reduce bundle

// Explicit columns to avoid select('*') — prevents data leakage and future schema breaks
const BLOCK_COLUMNS = 'id, title, slug, type, content, content_type, content_updated_at, summary, show_summary, icon, color_preset, order, parent_id, tips_type, hide_from_sidebar, hide_title, is_empty, is_single_section, show_title_in_menu, show_title_on_card, attachments, created_at, updated_at' as const;

/**
 * Paginated fetch — fetches all rows in pages of PAGE_SIZE to avoid Supabase's 1000-row default limit.
 */
const PAGE_SIZE = 500;

async function fetchAllPaginated<T>(
  buildQuery: (from: number, to: number) => ReturnType<typeof supabase.from>,
  label: string
): Promise<{ success: boolean; data: T[] }> {
  const allRows: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const result = await safeQuery<T[]>(buildQuery(from, to), `${label}_PAGE_${page}`);

    if (!result.success) {
      return { success: false, data: [] };
    }

    const rows = result.data || [];
    allRows.push(...rows);
    hasMore = rows.length === PAGE_SIZE;
    page++;
  }

  return { success: true, data: allRows };
}

interface CategoryBlock {
  id: string;
  title: string;
  slug?: string;
  order?: number;
}

type ExportScope = 'apogee' | 'apporteur' | 'helpconfort';

/** Build structured export data for a set of blocks (categories + sections) */
function buildStructuredExport(
  blocks: any[],
  scope: string,
  extraCatFields?: (cat: any) => Record<string, unknown>,
) {
  const categories = blocks.filter(b => b.type === 'category') || [];
  const sections = blocks.filter(b => b.type === 'section') || [];

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    type: scope,
    categories: categories.map(cat => ({
      id: cat.id, title: cat.title, slug: cat.slug, icon: cat.icon,
      colorPreset: cat.color_preset, order: cat.order,
      ...(extraCatFields ? extraCatFields(cat) : {}),
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
}

export const useAdminBackup = () => {
  const [apogeeCategories, setApogeeCategories] = useState<CategoryBlock[]>([]);
  const [helpconfortCategories, setHelpconfortCategories] = useState<CategoryBlock[]>([]);
  const [apporteurCategories, setApporteurCategories] = useState<CategoryBlock[]>([]);
  const [selectedApogeeCategories, setSelectedApogeeCategories] = useState<string[]>([]);
  const [selectedHelpconfortCategories, setSelectedHelpconfortCategories] = useState<string[]>([]);
  const [selectedApporteurCategories, setSelectedApporteurCategories] = useState<string[]>([]);
  const [exportingApogee, setExportingApogee] = useState(false);
  const [exportingHelpconfort, setExportingHelpconfort] = useState(false);
  const [exportingApporteur, setExportingApporteur] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const [apogeeResult, helpconfortResult, apporteurResult] = await Promise.all([
      safeQuery<CategoryBlock[]>(
        supabase.from('blocks').select('id, title, slug, order').eq('type', 'category').not('slug', 'like', 'helpconfort-%').order('order'),
        'BACKUP_APOGEE_CATEGORIES_LOAD'
      ),
      safeQuery<CategoryBlock[]>(
        supabase.from('blocks').select('id, title, slug, order').eq('type', 'category').like('slug', 'helpconfort-%').order('order'),
        'BACKUP_HELPCONFORT_CATEGORIES_LOAD'
      ),
      safeQuery<CategoryBlock[]>(
        supabase.from('apporteur_blocks').select('id, title, slug, order').eq('type', 'category').order('order'),
        'BACKUP_APPORTEUR_CATEGORIES_LOAD'
      ),
    ]);

    if (apogeeResult.data) setApogeeCategories(apogeeResult.data);
    if (helpconfortResult.data) setHelpconfortCategories(helpconfortResult.data);
    if (apporteurResult.data) setApporteurCategories(apporteurResult.data);
  };

  const getScopeConfig = (scope: ExportScope) => {
    switch (scope) {
      case 'apogee':
        return {
          setLoading: setExportingApogee,
          tableName: 'blocks' as const,
          title: 'MANUEL APOGÉE',
          guideTitle: 'Manuel Apogée',
          selectedCategories: selectedApogeeCategories,
          slugFilter: (query: any) => query.not('slug', 'like', 'helpconfort-%')
        };
      case 'helpconfort':
        return {
          setLoading: setExportingHelpconfort,
          tableName: 'blocks' as const,
          title: 'GUIDE HELPCONFORT',
          guideTitle: 'Guide HelpConfort',
          selectedCategories: selectedHelpconfortCategories,
          slugFilter: (query: any) => query.like('slug', 'helpconfort-%')
        };
      case 'apporteur':
        return {
          setLoading: setExportingApporteur,
          tableName: 'apporteur_blocks' as const,
          title: 'GUIDE APPORTEUR',
          guideTitle: 'Guide Apporteur',
          selectedCategories: selectedApporteurCategories,
          slugFilter: (query: any) => query
        };
    }
  };

  const exportApogeeData = async () => {
    setExportingApogee(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from('blocks').select(BLOCK_COLUMNS).order('order'),
        'BACKUP_EXPORT_APOGEE'
      );
      if (!result.success || !result.data) { errorToast('Impossible d\'exporter les données Apogée'); return; }

      const exportData = buildStructuredExport(result.data, 'apogee');
      downloadFile(JSON.stringify(exportData, null, 2), `export-apogee-${todayISO()}.json`, 'application/json');
      successToast('Export Apogée réussi !', `${exportData.stats.totalCategories} catégories, ${exportData.stats.totalSections} sections`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export Apogée', error);
      errorToast('Impossible d\'exporter les données Apogée');
    } finally { setExportingApogee(false); }
  };

  const exportHelpconfortData = async () => {
    setExportingHelpconfort(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from('blocks').select(BLOCK_COLUMNS).like('slug', 'helpconfort-%').order('order'),
        'BACKUP_EXPORT_HELPCONFORT'
      );
      if (!result.success || !result.data) { errorToast('Impossible d\'exporter les données HelpConfort'); return; }

      const exportData = buildStructuredExport(result.data, 'helpconfort');
      downloadFile(JSON.stringify(exportData, null, 2), `export-helpconfort-${todayISO()}.json`, 'application/json');
      successToast('Export HelpConfort réussi !', `${exportData.stats.totalCategories} catégories, ${exportData.stats.totalSections} sections`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export HelpConfort', error);
      errorToast('Impossible d\'exporter les données HelpConfort');
    } finally { setExportingHelpconfort(false); }
  };

  const exportApporteurData = async () => {
    setExportingApporteur(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from('apporteur_blocks').select(BLOCK_COLUMNS).order('order'),
        'BACKUP_EXPORT_APPORTEUR'
      );
      if (!result.success || !result.data) { errorToast('Impossible d\'exporter les données Apporteur'); return; }

      const exportData = buildStructuredExport(result.data, 'apporteur', cat => ({
        isSingleSection: cat.is_single_section, showTitleInMenu: cat.show_title_in_menu, showTitleOnCard: cat.show_title_on_card,
      }));
      downloadFile(JSON.stringify(exportData, null, 2), `export-apporteur-${todayISO()}.json`, 'application/json');
      successToast('Export Apporteur réussi !', `${exportData.stats.totalCategories} catégories, ${exportData.stats.totalSections} sections`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export Apporteur', error);
      errorToast('Impossible d\'exporter les données Apporteur');
    } finally { setExportingApporteur(false); }
  };

  const exportTextOnly = async (scope: ExportScope) => {
    const config = getScopeConfig(scope);
    config.setLoading(true);
    try {
      const baseQuery = supabase.from(config.tableName).select(BLOCK_COLUMNS).order('order');
      const result = await safeQuery<any[]>(config.slugFilter(baseQuery), `BACKUP_EXPORT_TEXT_${scope.toUpperCase()}`);
      if (!result.success || !result.data) { errorToast("Erreur d'export"); return; }

      const blocks = result.data;
      const categories = blocks.filter(b => b.type === 'category') || [];
      const sections = blocks.filter(b => b.type === 'section') || [];

      let textContent = `${config.title} - Export du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
      categories.forEach(cat => {
        textContent += `\n${'#'.repeat(70)}\nCATÉGORIE: ${cat.title.toUpperCase()}\n${'#'.repeat(70)}\n\n`;
        sections.filter(s => s.parent_id === cat.id).sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
      });

      downloadFile(textContent, `export-${scope}-texte-${todayISO()}.txt`, 'text/plain;charset=utf-8');
      successToast(`Export texte ${config.guideTitle} réussi !`, `${categories.length} catégories exportées`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export texte ${scope}`, error);
      errorToast("Erreur d'export");
    } finally { config.setLoading(false); }
  };

  const exportSingleCategory = async (scope: ExportScope, format: 'json' | 'txt') => {
    const config = getScopeConfig(scope);
    const categoryId = config.selectedCategories[0];
    if (!categoryId) { errorToast('Aucune catégorie sélectionnée'); return; }

    config.setLoading(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from(config.tableName).select(BLOCK_COLUMNS).or(`id.eq.${categoryId},parent_id.eq.${categoryId}`).order('order'),
        `BACKUP_EXPORT_SINGLE_${scope.toUpperCase()}`
      );
      if (!result.success || !result.data) { errorToast("Erreur d'export"); return; }

      const blocks = result.data;
      const category = blocks.find(b => b.id === categoryId);
      const sections = blocks.filter(b => b.parent_id === categoryId) || [];
      if (!category) { errorToast('Catégorie non trouvée'); return; }

      if (format === 'txt') {
        let textContent = `${config.title} - ${category.title.toUpperCase()}\nExport du ${new Date().toLocaleDateString('fr-FR')}\n${'='.repeat(70)}\n\n`;
        sections.sort((a, b) => a.order - b.order).forEach(section => {
          textContent += `\n${'-'.repeat(60)}\nSECTION: ${section.title}\n${'-'.repeat(60)}\n\n${extractPlainText(section.content)}\n\n`;
        });
        downloadFile(textContent, `export-${scope}-${category.slug}-${todayISO()}.txt`, 'text/plain;charset=utf-8');
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
        downloadFile(JSON.stringify(exportData, null, 2), `export-${scope}-${category.slug}-${todayISO()}.json`, 'application/json');
      }

      successToast(`Export ${format.toUpperCase()} réussi !`, `"${category.title}" avec ${sections.length} sections`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export single ${scope}`, error);
      errorToast("Erreur d'export");
    } finally { config.setLoading(false); }
  };

  const exportSingleCategoryPdf = async (scope: ExportScope) => {
    const config = getScopeConfig(scope);
    const categoryId = config.selectedCategories[0];
    if (!categoryId) { errorToast('Aucune catégorie sélectionnée'); return; }

    config.setLoading(true);
    try {
      const result = await safeQuery<any[]>(
        supabase.from(config.tableName).select(BLOCK_COLUMNS).or(`id.eq.${categoryId},parent_id.eq.${categoryId}`).order('order'),
        `BACKUP_EXPORT_PDF_${scope.toUpperCase()}`
      );
      if (!result.success || !result.data) { errorToast("Erreur d'export PDF"); return; }

      const blocks = result.data;
      const category = blocks.find(b => b.id === categoryId);
      const sections = blocks.filter(b => b.parent_id === categoryId).sort((a, b) => a.order - b.order);
      if (!category) { errorToast('Catégorie non trouvée'); return; }

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ctx = createPdfContext(pdf);

      renderTitlePage(ctx, config.guideTitle, category.title, sections.length);
      await renderSectionsToPdf(ctx, sections);

      pdf.save(`export-${scope}-${category.slug}-${todayISO()}.pdf`);
      successToast('Export PDF réussi !', `"${category.title}" avec ${sections.length} sections et images`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export PDF ${scope}`, error);
      errorToast("Erreur d'export PDF");
    } finally { config.setLoading(false); }
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
      const [blocksResult, apporteurBlocksResult, documentsResult, categoriesResult, sectionsResult] = await Promise.all([
        fetchAllPaginated<Record<string, unknown>>(
          (from, to) => supabase.from('blocks').select(BLOCK_COLUMNS).order('order').range(from, to),
          'BACKUP_EXPORT_ALL_BLOCKS'
        ),
        fetchAllPaginated<Record<string, unknown>>(
          (from, to) => supabase.from('apporteur_blocks').select(BLOCK_COLUMNS).order('order').range(from, to),
          'BACKUP_EXPORT_ALL_APPORTEUR'
        ),
        fetchAllPaginated<Record<string, unknown>>(
          (from, to) => supabase.from('documents').select('id, title, content, category_id, order, created_at, updated_at').order('id').range(from, to),
          'BACKUP_EXPORT_ALL_DOCUMENTS'
        ),
        fetchAllPaginated<Record<string, unknown>>(
          (from, to) => supabase.from('categories').select('id, name, slug, order, created_at, updated_at').order('id').range(from, to),
          'BACKUP_EXPORT_ALL_CATEGORIES'
        ),
        fetchAllPaginated<Record<string, unknown>>(
          (from, to) => supabase.from('sections').select('id, title, content, category_id, order, created_at, updated_at').order('id').range(from, to),
          'BACKUP_EXPORT_ALL_SECTIONS'
        ),
      ]);

      if (!blocksResult.success || !apporteurBlocksResult.success || !documentsResult.success || !categoriesResult.success || !sectionsResult.success) {
        errorToast("Erreur d'export"); return;
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

      downloadFile(JSON.stringify(backupData, null, 2), `backup-helpogee-complet-${todayISO()}.json`, 'application/json');
      setLastBackup(new Date());
      successToast('Export complet réussi !', `${backupData.stats.totalBlocks} blocs, ${backupData.stats.totalDocuments} documents`);
    } catch (error) {
      logError('use-admin-backup', 'Erreur export complet', error);
      errorToast("Erreur d'export");
    } finally { setExporting(false); }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (!backupData.data) { errorToast('Format de fichier invalide'); return; }

      if (!confirm(`⚠️ ATTENTION: Cette opération va ÉCRASER toutes les données actuelles.\n\nVoulez-vous vraiment continuer ?\n\nDonnées à importer:\n- ${backupData.stats?.totalBlocks || 0} blocs\n- ${backupData.stats?.totalDocuments || 0} documents`)) {
        setImporting(false); return;
      }

      await Promise.all([
        safeMutation(supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'), 'BACKUP_IMPORT_DELETE_BLOCKS'),
        safeMutation(supabase.from('apporteur_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000'), 'BACKUP_IMPORT_DELETE_APPORTEUR'),
      ]);

      const insertPromises = [];
      if (backupData.data.blocks?.length > 0) {
        insertPromises.push(safeMutation(supabase.from('blocks').insert(backupData.data.blocks), 'BACKUP_IMPORT_INSERT_BLOCKS'));
      }
      if (backupData.data.apporteur_blocks?.length > 0) {
        insertPromises.push(safeMutation(supabase.from('apporteur_blocks').insert(backupData.data.apporteur_blocks), 'BACKUP_IMPORT_INSERT_APPORTEUR'));
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

  const exportMultipleCategoriesPdf = async (scope: ExportScope) => {
    const config = getScopeConfig(scope);
    if (config.selectedCategories.length === 0) { errorToast('Aucune catégorie sélectionnée'); return; }

    config.setLoading(true);
    let exportedCount = 0;

    try {
      for (const categoryId of config.selectedCategories) {
        const result = await safeQuery<any[]>(
          supabase.from(config.tableName).select('*').or(`id.eq.${categoryId},parent_id.eq.${categoryId}`).order('order'),
          `BACKUP_EXPORT_MULTI_PDF_${scope.toUpperCase()}`
        );
        if (!result.success || !result.data) continue;

        const blocks = result.data;
        const category = blocks.find(b => b.id === categoryId);
        const sections = blocks.filter(b => b.parent_id === categoryId).sort((a, b) => a.order - b.order);
        if (!category) continue;

        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const ctx = createPdfContext(pdf);

        renderTitlePage(ctx, config.guideTitle, category.title, sections.length);
        await renderSectionsToPdf(ctx, sections);

        pdf.save(`export-${scope}-${category.slug}-${todayISO()}.pdf`);
        exportedCount++;

        // Small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      successToast('Export PDF terminé !', `${exportedCount} fichier(s) PDF exporté(s)`);
    } catch (error) {
      logError('use-admin-backup', `Erreur export multi PDF ${scope}`, error);
      errorToast("Erreur d'export PDF");
    } finally { config.setLoading(false); }
  };

  return {
    apogeeCategories, helpconfortCategories, apporteurCategories,
    selectedApogeeCategories, selectedHelpconfortCategories, selectedApporteurCategories,
    setSelectedApogeeCategories, setSelectedHelpconfortCategories, setSelectedApporteurCategories,
    exportingApogee, exportingHelpconfort, exportingApporteur, exporting, importing, lastBackup,
    exportApogeeData, exportHelpconfortData, exportApporteurData, exportTextOnly, exportSingleCategory, exportSingleCategoryPdf, exportMultipleCategoriesPdf, exportAllData, importData,
  };
};
