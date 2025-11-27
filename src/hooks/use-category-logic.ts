import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useToast } from '@/hooks/use-toast';
import { Block, ColorPreset, TipsType } from '@/types/block';
import { Section } from '@/components/category/types';

interface UseCategoryLogicProps {
  blocks: Block[];
  categoryId: string | undefined;
  isEditMode: boolean;
  updateBlock: (id: string, data: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  addBlock: (block: Partial<Block>) => Promise<string | null>;
  reorderBlocks: (blocks: Block[]) => Promise<void>;
  slugDependency?: string; // for resetting filters when slug changes
}

export function useCategoryLogic({
  blocks,
  categoryId,
  isEditMode,
  updateBlock,
  deleteBlock,
  addBlock,
  reorderBlocks,
  slugDependency,
}: UseCategoryLogicProps) {
  const location = useLocation();
  const { toast } = useToast();

  // Memoized sections
  const sections = useMemo(() => 
    blocks
      .filter(b => b.type === 'section' && b.parentId === categoryId)
      .sort((a, b) => a.order - b.order) as Section[],
    [blocks, categoryId]
  );

  // State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);

  // Auto-expand TIPS on load
  useEffect(() => {
    const tipsIds = sections
      .filter(s => s.contentType === 'tips' && !s.isSingleSection && !s.hideTitle)
      .map(s => s.id);
    
    setOpenAccordions(prev => {
      const newIds = tipsIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [sections]);

  // Reset filters when slug changes
  useEffect(() => {
    setShowTips(true);
    setShowSections(true);
  }, [slugDependency]);

  // Auto-open section from URL hash
  useEffect(() => {
    if (!categoryId) return;
    
    const hash = location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash || s.slug === hash)) {
      setOpenAccordions(prev => prev.includes(hash) ? prev : [...prev, hash]);
      
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerOffset = 140;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 400);
    }
  }, [location.hash, sections, categoryId]);

  // Reset accordions when edit mode changes
  useEffect(() => {
    setOpenAccordions([]);
  }, [isEditMode]);

  // Preserve scroll position on tab change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        savedScrollPositionRef.current = window.scrollY;
      } else {
        setTimeout(() => {
          if (savedScrollPositionRef.current > 0) {
            window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
          }
        }, 50);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save scroll position periodically during edit
  useEffect(() => {
    const saveScrollPosition = () => {
      if (editingId) {
        savedScrollPositionRef.current = window.scrollY;
      }
    };

    const intervalId = setInterval(saveScrollPosition, 1000);
    return () => clearInterval(intervalId);
  }, [editingId]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handlers
  const handleEdit = (sectionId: string) => {
    setEditingId(sectionId);
    setOpenAccordions(prev => prev.includes(sectionId) ? prev : [...prev, sectionId]);
    setEditDialogOpen(true);
  };

  const restoreScrollPosition = (scrollPos: number) => {
    const currentHash = window.location.hash;
    if (currentHash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    
    setEditDialogOpen(false);
    setEditingId(null);
    
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPos);
      setTimeout(() => {
        window.scrollTo(0, scrollPos);
        if (currentHash) {
          history.replaceState(null, '', window.location.pathname + window.location.search + currentHash);
        }
      }, 0);
      setTimeout(() => window.scrollTo(0, scrollPos), 50);
      setTimeout(() => window.scrollTo(0, scrollPos), 100);
    });
  };

  const handleSave = async (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar?: boolean;
    summary?: string;
    showSummary?: boolean;
    hideTitle?: boolean;
  }) => {
    if (editingId) {
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      updateBlock(editingId, data);
      restoreScrollPosition(scrollPos);
    }
  };

  const handleSaveTips = async (
    title: string,
    content: string,
    tipsType: TipsType,
    hideFromSidebar: boolean
  ) => {
    if (editingId) {
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      
      const colorMap: Record<TipsType, ColorPreset> = {
        danger: 'red',
        warning: 'orange',
        success: 'green',
        information: 'blue',
      };

      updateBlock(editingId, {
        title,
        content,
        colorPreset: colorMap[tipsType],
        hideFromSidebar,
        hideTitle: true,
        tipsType,
        contentType: 'tips',
      });

      restoreScrollPosition(scrollPos);
    }
  };

  const handleMoveToCategory = (sectionId: string, newParentId: string) => {
    const newParentSections = blocks
      .filter(b => b.type === 'section' && b.parentId === newParentId)
      .sort((a, b) => a.order - b.order);
    
    const newOrder = newParentSections.length > 0 
      ? newParentSections[0].order - 1 
      : 0;
    
    updateBlock(sectionId, { parentId: newParentId, order: newOrder });
  };

  const calculateNewOrder = (afterSectionId?: string): number => {
    if (afterSectionId) {
      const afterSection = sections.find(s => s.id === afterSectionId);
      const afterIndex = sections.findIndex(s => s.id === afterSectionId);
      
      if (afterIndex === sections.length - 1) {
        return afterSection!.order + 1;
      } else {
        const nextSection = sections[afterIndex + 1];
        return Math.floor((afterSection!.order + nextSection.order) / 2);
      }
    }
    return sections.length > 0 ? sections[0].order - 1 : 0;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      const minOrder = Math.min(...sections.map(s => s.order));
      const sectionsWithNewOrder = reorderedSections.map((section, index) => ({
        ...section,
        order: minOrder + index
      }));
      
      await reorderBlocks(sectionsWithNewOrder);
    }
  };

  const handleDeleteClick = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteBlock(sectionToDelete);
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = async (sectionId: string, parentId: string, slugPrefix: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate) return;

    const currentIndex = sections.findIndex(s => s.id === sectionId);
    const nextSection = sections[currentIndex + 1];
    const newOrder = nextSection 
      ? (sectionToDuplicate.order + nextSection.order) / 2
      : sectionToDuplicate.order + 1;

    const newBlockId = await addBlock({
      type: 'section',
      title: `${sectionToDuplicate.title} (copie)`,
      content: sectionToDuplicate.content,
      colorPreset: sectionToDuplicate.colorPreset,
      parentId,
      slug: `${slugPrefix}-section-${Date.now()}`,
      attachments: sectionToDuplicate.attachments || [],
      hideFromSidebar: sectionToDuplicate.hideFromSidebar,
      order: newOrder,
    });

    if (newBlockId) {
      setTimeout(async () => {
        await updateBlock(newBlockId, { order: newOrder });
        toast({ 
          title: 'Section dupliquée', 
          description: 'La section a été dupliquée avec succès' 
        });
      }, 50);
    }
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingId(null);
  };

  // Computed values
  const editingSection = sections.find(s => s.id === editingId);
  
  const filteredSections = sections.filter(section => {
    if (section.contentType === 'tips' && !showTips) return false;
    if (section.contentType !== 'tips' && !showSections) return false;
    return true;
  });

  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  return {
    // State
    sections,
    editingId,
    editDialogOpen,
    deleteDialogOpen,
    openAccordions,
    showTips,
    showSections,
    editingSection,
    filteredSections,
    hasTips,
    hasSections,
    sensors,
    
    // Setters
    setOpenAccordions,
    setShowTips,
    setShowSections,
    setDeleteDialogOpen,
    
    // Handlers
    handleEdit,
    handleSave,
    handleSaveTips,
    handleMoveToCategory,
    calculateNewOrder,
    handleDragEnd,
    handleDeleteClick,
    confirmDelete,
    handleDuplicate,
    closeEditDialog,
  };
}
