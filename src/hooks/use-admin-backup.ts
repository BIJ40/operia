import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CategoryData {
  id: string;
  title: string;
  scope: string;
  display_order: number;
  icon: string;
  color_preset: string;
}

export const useAdminBackup = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedApogeeCategory, setSelectedApogeeCategory] = useState<string>('');
  const [selectedApporteurCategory, setSelectedApporteurCategory] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('scope', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Erreur lors du chargement des catégories');
    }
  };

  const extractPlainText = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const cleanHtmlForExport = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const elements = temp.querySelectorAll('*');
    elements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        if (!['href', 'src', 'alt', 'title'].includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return temp.innerHTML;
  };

  const exportApogeeData = async () => {
    setIsExporting(true);
    try {
      const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .order('order', { ascending: true });

      if (blocksError) throw blocksError;

      const categoriesData = blocks?.filter((b) => b.type === 'category') || [];
      const sectionsData = blocks?.filter((b) => b.type === 'section') || [];

      const structured = {
        version: '1.0',
        export_date: new Date().toISOString(),
        scope: 'apogee',
        categories: categoriesData.map((cat) => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          color_preset: cat.color_preset,
          order: cat.order,
          sections: sectionsData
            .filter((s) => s.parent_id === cat.id)
            .map((s) => ({
              id: s.id,
              title: s.title,
              content: cleanHtmlForExport(s.content),
              slug: s.slug,
              order: s.order,
              content_type: s.content_type,
              tips_type: s.tips_type,
              hide_title: s.hide_title,
              show_summary: s.show_summary,
              summary: s.summary,
              attachments: s.attachments,
            })),
        })),
      };

      const blob = new Blob([JSON.stringify(structured, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apogee-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export JSON Apogée terminé');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportApporteurData = async () => {
    setIsExporting(true);
    try {
      const { data: blocks, error: blocksError } = await supabase
        .from('apporteur_blocks')
        .select('*')
        .order('order', { ascending: true });

      if (blocksError) throw blocksError;

      const categoriesData = blocks?.filter((b) => b.type === 'category') || [];
      const sectionsData = blocks?.filter((b) => b.type === 'section') || [];

      const structured = {
        version: '1.0',
        export_date: new Date().toISOString(),
        scope: 'apporteur',
        categories: categoriesData.map((cat) => ({
          id: cat.id,
          title: cat.title,
          slug: cat.slug,
          icon: cat.icon,
          color_preset: cat.color_preset,
          order: cat.order,
          sections: sectionsData
            .filter((s) => s.parent_id === cat.id)
            .map((s) => ({
              id: s.id,
              title: s.title,
              content: cleanHtmlForExport(s.content),
              slug: s.slug,
              order: s.order,
              content_type: s.content_type,
              tips_type: s.tips_type,
              hide_title: s.hide_title,
              show_summary: s.show_summary,
              summary: s.summary,
              attachments: s.attachments,
            })),
        })),
      };

      const blob = new Blob([JSON.stringify(structured, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apporteur-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export JSON Apporteurs terminé');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      const { data: blocks, error: blocksError } = await supabase.from('blocks').select('*');
      const { data: apporteurBlocks, error: apporteurError } = await supabase.from('apporteur_blocks').select('*');
      const { data: documents, error: documentsError } = await supabase.from('documents').select('*');
      const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
      const { data: sections, error: sectionsError } = await supabase.from('sections').select('*');

      if (blocksError || apporteurError || documentsError || categoriesError || sectionsError) {
        throw blocksError || apporteurError || documentsError || categoriesError || sectionsError;
      }

      const backup = {
        version: '2.0',
        export_date: new Date().toISOString(),
        blocks: blocks || [],
        apporteur_blocks: apporteurBlocks || [],
        documents: documents || [],
        categories: categories || [],
        sections: sections || [],
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Sauvegarde complète terminée');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Erreur lors de la sauvegarde');
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
      const backup = JSON.parse(text);

      if (!backup.version) {
        throw new Error('Format de sauvegarde invalide');
      }

      const confirmMessage = `Êtes-vous sûr de vouloir restaurer cette sauvegarde ? Toutes les données actuelles seront SUPPRIMÉES et remplacées.`;
      if (!window.confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }

      await supabase.from('blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('apporteur_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('sections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      if (backup.blocks?.length > 0) {
        const { error } = await supabase.from('blocks').insert(backup.blocks);
        if (error) throw error;
      }

      if (backup.apporteur_blocks?.length > 0) {
        const { error } = await supabase.from('apporteur_blocks').insert(backup.apporteur_blocks);
        if (error) throw error;
      }

      if (backup.documents?.length > 0) {
        const { error } = await supabase.from('documents').insert(backup.documents);
        if (error) throw error;
      }

      if (backup.categories?.length > 0) {
        const { error } = await supabase.from('categories').insert(backup.categories);
        if (error) throw error;
      }

      if (backup.sections?.length > 0) {
        const { error } = await supabase.from('sections').insert(backup.sections);
        if (error) throw error;
      }

      toast.success('Restauration terminée avec succès');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  return {
    categories,
    selectedApogeeCategory,
    selectedApporteurCategory,
    isExporting,
    isImporting,
    setSelectedApogeeCategory,
    setSelectedApporteurCategory,
    loadCategories,
    exportApogeeData,
    exportApporteurData,
    exportAllData,
    importData,
  };
};
