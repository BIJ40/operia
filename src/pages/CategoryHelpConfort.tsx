import { useParams, useLocation } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useMemo } from 'react';
import { SectionEditForm } from '@/components/SectionEditForm';
import { ColorPreset } from '@/types/block';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SortableSectionProps {
  section: any;
  isEditMode: boolean;
  onEdit: (section: any) => void;
  onDelete: (id: string) => void;
  openAccordions: string[];
  getColorClass: (color?: ColorPreset) => string;
}

function SortableSection({
  section,
  isEditMode,
  onEdit,
  onDelete,
  openAccordions,
  getColorClass,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <AccordionItem 
        value={section.id} 
        className={`border rounded-lg ${getColorClass(section.colorPreset)}`}
      >
        <div className="flex items-center gap-2 pr-4">
          {isEditMode && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing pl-4 py-4"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <AccordionTrigger className="flex-1 hover:no-underline px-6">
            <span className="font-semibold">{section.title}</span>
          </AccordionTrigger>
          {isEditMode && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(section);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(section.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <AccordionContent className="px-6 pb-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: section.content }} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

export default function CategoryHelpConfort() {
  const { slug } = useParams();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useEditor();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  
  const sections = useMemo(() => 
    blocks
      .filter(b => b.type === 'section' && b.parentId === category?.id)
      .sort((a, b) => a.order - b.order),
    [blocks, category?.id]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColorClass = (color?: ColorPreset) => {
    const colorMap: Record<ColorPreset, string> = {
      white: 'bg-card',
      blanc: 'bg-card',
      gray: 'bg-muted',
      green: 'bg-green-50 dark:bg-green-950',
      yellow: 'bg-yellow-50 dark:bg-yellow-950',
      red: 'bg-red-50 dark:bg-red-950',
      blue: 'bg-blue-50 dark:bg-blue-950',
      purple: 'bg-purple-50 dark:bg-purple-950',
      pink: 'bg-pink-50 dark:bg-pink-950',
      orange: 'bg-orange-50 dark:bg-orange-950',
      cyan: 'bg-cyan-50 dark:bg-cyan-950',
      indigo: 'bg-indigo-50 dark:bg-indigo-950',
      teal: 'bg-teal-50 dark:bg-teal-950',
      rose: 'bg-rose-50 dark:bg-rose-950',
    };
    return colorMap[color || 'white'];
  };

  useEffect(() => {
    if (!category) return;
    
    const hash = location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash)) {
      setOpenAccordions(prev => {
        if (!prev.includes(hash)) {
          return [...prev, hash];
        }
        return prev;
      });
      
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerOffset = 140;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 400);
    }
  }, [location.hash, sections, category]);

  useEffect(() => {
    setOpenAccordions([]);
  }, [isEditMode]);

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleEdit = (block: typeof sections[0]) => {
    setEditingId(block.id);
    setOpenAccordions(prev => {
      if (!prev.includes(block.id)) {
        return [...prev, block.id];
      }
      return prev;
    });
  };

  const handleSave = async (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    summary?: string;
    showSummary?: boolean;
  }) => {
    if (editingId) {
      const scrollPos = window.pageYOffset;
      const currentHash = window.location.hash;
      if (currentHash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      updateBlock(editingId, data);

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
      });
      
      toast({
        title: 'Section sauvegardée',
        description: 'Les modifications ont été enregistrées',
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditDialogOpen(false);
  };

  const handleAddSection = async () => {
    if (!category) return;
    
    const newOrder = sections.length > 0 
      ? sections[0].order - 1 
      : 0;
    
    const newBlockId = await addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '<p>Contenu de la section...</p>',
      colorPreset: 'purple',
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: [],
      contentType: 'section',
      order: newOrder,
    });
    
    if (newBlockId) {
      setTimeout(() => {
        setEditingId(newBlockId);
        setEditDialogOpen(true);
      }, 100);
    }
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
      toast({
        title: 'Section supprimée',
      });
    }
    setDeleteDialogOpen(false);
  };

  const editingSection = sections.find(s => s.id === editingId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{category.title}</h1>
        
        {isAdmin && isEditMode && (
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une section
            </Button>
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Aucune section pour le moment
          </p>
          {isAdmin && isEditMode && (
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Créer la première section
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
            disabled={!isEditMode}
          >
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
            >
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isEditMode={isEditMode}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  openAccordions={openAccordions}
                  getColorClass={getColorClass}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Éditer la section</DialogTitle>
          </DialogHeader>
          {editingSection && (
            <SectionEditForm
              sectionId={editingSection.id}
              initialTitle={editingSection.title}
              initialContent={editingSection.content}
              initialColor={editingSection.colorPreset}
              initialSummary={editingSection.summary}
              initialShowSummary={editingSection.showSummary}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette section ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
