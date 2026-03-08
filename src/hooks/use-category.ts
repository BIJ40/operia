import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { supabase } from '@/integrations/supabase/client';
import { safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';
import { Block, Attachment } from '@/types/block';
import type { DragEndEvent } from '@dnd-kit/core';
import type { Json } from '@/integrations/supabase/types';

export type Section = Block;

export const useCategory = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { blocks, reloadBlocks } = useEditor();
  const { user } = useAuthCore();
  const { isAdmin } = usePermissions();

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
      .filter((b) => b.parentId === category.id)
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

    const result = await safeMutation(
      supabase
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
        .eq('id', updatedSection.id),
      'CATEGORY_UPDATE_SECTION'
    );

    if (!result.success) {
      logError('category', 'Error updating section', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    setEditDialogOpen(false);
    setEditingSection(null);
    successToast('Section mise à jour');
  };

  const handleSaveTips = async (updatedSection: Section) => {
    if (!updatedSection.id) return;

    const result = await safeMutation(
      supabase
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
        .eq('id', updatedSection.id),
      'CATEGORY_UPDATE_TIPS'
    );

    if (!result.success) {
      logError('category', 'Error updating tips', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    setTipsEditDialogOpen(false);
    setEditingSection(null);
    successToast('TIPS mis à jour');
  };

  const handleDeleteClick = (section: Section) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    const contentLength = sectionToDelete.content?.length || 0;

    if (contentLength < 50) {
      const result = await safeMutation(
        supabase
          .from('blocks')
          .delete()
          .eq('id', sectionToDelete.id),
        'CATEGORY_DELETE_SECTION'
      );

      if (!result.success) {
        logError('category', 'Error deleting section', result.error);
        errorToast(result.error!);
        return;
      }
      successToast('Section supprimée définitivement');
    } else {
      const result = await safeMutation(
        supabase
          .from('blocks')
          .update({ hide_from_sidebar: true })
          .eq('id', sectionToDelete.id),
        'CATEGORY_ARCHIVE_SECTION'
      );

      if (!result.success) {
        logError('category', 'Error archiving section', result.error);
        errorToast(result.error!);
        return;
      }
      successToast('Section archivée (contenu conservé en base)');
    }

    await reloadBlocks();
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
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

    const result = await safeMutation(
      supabase.from('blocks').insert([newSection]),
      'CATEGORY_ADD_SECTION'
    );

    if (!result.success) {
      logError('category', 'Error adding section', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    successToast('Section ajoutée');
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

    const result = await safeMutation(
      supabase.from('blocks').insert([newTips]),
      'CATEGORY_ADD_TIPS'
    );

    if (!result.success) {
      logError('category', 'Error adding tips', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    successToast('TIPS ajouté');
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

    const result = await safeMutation(
      supabase.from('blocks').insert([duplicatedSection]),
      'CATEGORY_DUPLICATE_SECTION'
    );

    if (!result.success) {
      logError('category', 'Error duplicating section', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    successToast('Section dupliquée');
  };

  const handleMoveToCategory = async (sectionId: string, targetCategoryId: string) => {
    const result = await safeMutation(
      supabase
        .from('blocks')
        .update({ parent_id: targetCategoryId })
        .eq('id', sectionId),
      'CATEGORY_MOVE_SECTION'
    );

    if (!result.success) {
      logError('category', 'Error moving section', result.error);
      errorToast(result.error!);
      return;
    }

    await reloadBlocks();
    successToast('Section déplacée');
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

    for (const update of updates) {
      const result = await safeMutation(
        supabase
          .from('blocks')
          .update({ order: update.order })
          .eq('id', update.id),
        'CATEGORY_REORDER_SECTION'
      );

      if (!result.success) {
        logError('category', 'Error reordering sections', result.error);
        errorToast(result.error!);
        return;
      }
    }

    await reloadBlocks();
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
