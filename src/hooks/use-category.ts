import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { Block } from '@/types/block';

export interface Section extends Block {}

export const useCategory = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { blocks, reloadBlocks } = useEditor();
  const { user, isAdmin } = useAuth();

  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tipsEditDialogOpen, setTipsEditDialogOpen] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);
  const [accordionStates, setAccordionStates] = useState<Record<string, boolean>>({});

  const category = useMemo(
    () => blocks.find((b) => b.type === 'category' && b.slug === slug),
    [blocks, slug]
  );

  const availableCategories = useMemo(
    () => blocks.filter((b) => b.type === 'category' && b.id !== category?.id),
    [blocks, category]
  );

  const sections = useMemo(() => {
    if (!category) return [];
    return blocks
      .filter((b) => b.parentId === category.id && !b.hideFromSidebar)
      .sort((a, b) => a.order - b.order);
  }, [blocks, category]);

  useEffect(() => {
    if (!category && slug) {
      navigate('/apogee');
    }
  }, [category, slug, navigate]);

  useEffect(() => {
    const savedStates = localStorage.getItem(`accordion-states-${slug}`);
    if (savedStates) {
      setAccordionStates(JSON.parse(savedStates));
    } else {
      const defaultStates: Record<string, boolean> = {};
      sections.forEach((section) => {
        defaultStates[section.id] = section.contentType === 'tips';
      });
      setAccordionStates(defaultStates);
    }
  }, [slug, sections]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && sections.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setAccordionStates((prev) => ({ ...prev, [hash]: true }));
        }
      }, 300);
    }
  }, [sections]);

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    if (section.contentType === 'tips') {
      setTipsEditDialogOpen(true);
    } else {
      setEditDialogOpen(true);
    }
  };

  const handleSave = async (updatedSection: Section) => {
    if (!updatedSection.id) return;

    try {
      const { error } = await supabase
        .from('blocks')
        .update({
          title: updatedSection.title,
          content: updatedSection.content,
          icon: updatedSection.icon,
          color_preset: updatedSection.colorPreset,
          hide_title: updatedSection.hideTitle,
          show_summary: updatedSection.showSummary,
          summary: updatedSection.summary,
          attachments: updatedSection.attachments as any || [],
          hide_from_sidebar: updatedSection.hideFromSidebar,
          is_in_progress: updatedSection.isInProgress || false,
          completed_at: updatedSection.completedAt || null,
          content_updated_at: updatedSection.contentUpdatedAt || null,
          is_empty: updatedSection.isEmpty || false,
        })
        .eq('id', updatedSection.id);

      if (error) throw error;

      await reloadBlocks();
      setEditDialogOpen(false);
      setEditingSection(null);
      toast.success('Section mise à jour');
    } catch (error) {
      logError('[CATEGORY] Error updating section', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveTips = async (updatedSection: Section) => {
    if (!updatedSection.id) return;

    try {
      const { error } = await supabase
        .from('blocks')
        .update({
          title: updatedSection.title,
          content: updatedSection.content,
          icon: updatedSection.icon,
          color_preset: updatedSection.colorPreset,
          tips_type: updatedSection.tipsType,
          hide_title: updatedSection.hideTitle,
          attachments: updatedSection.attachments as any || [],
          hide_from_sidebar: updatedSection.hideFromSidebar,
          is_in_progress: updatedSection.isInProgress || false,
          completed_at: updatedSection.completedAt || null,
          content_updated_at: updatedSection.contentUpdatedAt || null,
          is_empty: updatedSection.isEmpty || false,
        })
        .eq('id', updatedSection.id);

      if (error) throw error;

      await reloadBlocks();
      setTipsEditDialogOpen(false);
      setEditingSection(null);
      toast.success('TIPS mis à jour');
    } catch (error) {
      logError('[CATEGORY] Error updating tips', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteClick = (section: Section) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    try {
      const contentLength = sectionToDelete.content?.length || 0;

      if (contentLength < 50) {
        // Suppression définitive pour les sections vides ou quasi-vides
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('id', sectionToDelete.id);

        if (error) throw error;
        toast.success('Section supprimée définitivement');
      } else {
        // Archivage pour les sections avec contenu
        const { error } = await supabase
          .from('blocks')
          .update({ hide_from_sidebar: true })
          .eq('id', sectionToDelete.id);

        if (error) throw error;
        toast.success('Section archivée (contenu conservé en base)');
      }

      await reloadBlocks();
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
    } catch (error) {
      logError('[CATEGORY] Error deleting section', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddSection = async () => {
    if (!category) return;

    const maxOrder = Math.max(...sections.map((s) => s.order), -1);
    const newSection = {
      title: 'Nouvelle section',
      content: '',
      slug: `nouvelle-section-${Date.now()}`,
      parent_id: category.id,
      color_preset: category.colorPreset,
      type: 'section',
      order: maxOrder + 1,
      content_type: 'section',
    };

    try {
      const { error } = await supabase.from('blocks').insert([newSection]);
      if (error) throw error;

      await reloadBlocks();
      toast.success('Section ajoutée');
    } catch (error) {
      logError('[CATEGORY] Error adding section', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleAddTips = async () => {
    if (!category) return;

    const maxOrder = Math.max(...sections.map((s) => s.order), -1);
    const newTips = {
      title: 'Nouveau TIPS',
      content: '',
      slug: `nouveau-tips-${Date.now()}`,
      parent_id: category.id,
      color_preset: category.colorPreset,
      type: 'section',
      order: maxOrder + 1,
      content_type: 'tips',
      tips_type: 'warning',
      hide_title: true,
    };

    try {
      const { error } = await supabase.from('blocks').insert([newTips]);
      if (error) throw error;

      await reloadBlocks();
      toast.success('TIPS ajouté');
    } catch (error) {
      logError('[CATEGORY] Error adding tips', error);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleDuplicate = async (section: Section) => {
    if (!category) return;

    const maxOrder = Math.max(...sections.map((s) => s.order), -1);
    const duplicatedSection = {
      title: `${section.title} (copie)`,
      content: section.content,
      slug: `${section.slug}-copie-${Date.now()}`,
      parent_id: category.id,
      color_preset: section.colorPreset,
      icon: section.icon,
      type: section.type,
      order: maxOrder + 1,
      content_type: section.contentType,
      tips_type: section.tipsType,
      hide_title: section.hideTitle,
      show_summary: section.showSummary,
      summary: section.summary,
      attachments: section.attachments as any || [],
    };

    try {
      const { error } = await supabase.from('blocks').insert([duplicatedSection]);
      if (error) throw error;

      await reloadBlocks();
      toast.success('Section dupliquée');
    } catch (error) {
      logError('[CATEGORY] Error duplicating section', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleMoveToCategory = async (sectionId: string, targetCategoryId: string) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .update({ parent_id: targetCategoryId })
        .eq('id', sectionId);

      if (error) throw error;

      await reloadBlocks();
      toast.success('Section déplacée');
    } catch (error) {
      logError('[CATEGORY] Error moving section', error);
      toast.error('Erreur lors du déplacement');
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newSections = [...sections];
    const [movedSection] = newSections.splice(oldIndex, 1);
    newSections.splice(newIndex, 0, movedSection);

    const updates = newSections.map((section, index) => ({
      id: section.id,
      order: index,
    }));

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('blocks')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }

      await reloadBlocks();
    } catch (error) {
      logError('[CATEGORY] Error reordering sections', error);
      toast.error('Erreur lors du réordonnancement');
    }
  };

  return {
    category,
    sections,
    availableCategories,
    editingSection,
    deleteDialogOpen,
    sectionToDelete,
    editDialogOpen,
    tipsEditDialogOpen,
    showTips,
    showSections,
    accordionStates,
    isAdmin,
    user,
    setEditingSection,
    setDeleteDialogOpen,
    setSectionToDelete,
    setEditDialogOpen,
    setTipsEditDialogOpen,
    setShowTips,
    setShowSections,
    setAccordionStates,
    handleEdit,
    handleSave,
    handleSaveTips,
    handleDeleteClick,
    confirmDelete,
    handleAddSection,
    handleAddTips,
    handleDuplicate,
    handleMoveToCategory,
    handleDragEnd,
  };
};
