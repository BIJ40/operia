// Page Category pour Apporteurs (utilise apporteur_blocks)
import { useParams, useLocation } from 'react-router-dom';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, ChevronDown, FolderInput } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useState, useEffect, useMemo, useRef } from 'react';
import { SectionEditForm } from '@/components/SectionEditForm';
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

export default function CategoryApporteur() {
  const { slug, subslug } = useParams<{ slug: string; subslug: string }>();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useApporteurEditor();
  const { isAuthenticated } = useAuth();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  const subcategory = blocks.find(b => b.type === 'subcategory' && b.slug === subslug);
  
  if (!category || !subcategory) {
    return <div className="container max-w-4xl mx-auto p-8">Page non trouvée</div>;
  }
  
  const availableSubcategories = useMemo(() =>
    blocks
      .filter(b => b.type === 'subcategory' && b.parentId === category.id)
      .sort((a, b) => a.order - b.order),
    [blocks, category.id]
  );
  
  const sections = useMemo(() => 
    blocks
      .filter(b => b.type === 'section' && b.parentId === subcategory?.id)
      .sort((a, b) => a.order - b.order),
    [blocks, subcategory?.id]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && sections.some(s => s.slug === hash)) {
      setOpenAccordions(prev => {
        if (!prev.includes(hash)) {
          return [...prev, hash];
        }
        return prev;
      });
      
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash, sections]);

  const handleEdit = (id: string) => {
    if (editingId) {
      savedScrollPositionRef.current = window.scrollY;
    }
    setEditingId(id);
  };

  const handleSaveSection = (id: string, updates: any) => {
    updateBlock(id, updates);
    setEditingId(null);
    setTimeout(() => {
      window.scrollTo(0, savedScrollPositionRef.current);
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTimeout(() => {
      window.scrollTo(0, savedScrollPositionRef.current);
    }, 0);
  };

  const handleDelete = (id: string) => {
    setSectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteBlock(sectionToDelete);
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddSection = () => {
    addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '',
      colorPreset: subcategory.colorPreset || 'blue',
      slug: `section-${Date.now()}`,
      parentId: subcategory.id,
      attachments: [],
    });
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      
      reorderedSections.forEach((section, index) => {
        updateBlock(section.id, { order: index });
      });
    }
  };

  interface SortableSectionProps {
    section: any;
    index: number;
  }

  const SortableSection = ({ section, index }: SortableSectionProps) => {
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
      <div ref={setNodeRef} style={style}>
        <AccordionItem value={section.slug} id={section.slug}>
          <div className="relative">
            {isEditMode && (
              <div
                {...attributes}
                {...listeners}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-8 cursor-grab active:cursor-grabbing z-10"
              >
                <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
              </div>
            )}
            <AccordionTrigger className="text-lg font-semibold hover:no-underline px-6 py-4 bg-muted/30 rounded-t-lg data-[state=open]:rounded-none">
              {section.title}
            </AccordionTrigger>
          </div>
          <AccordionContent className="px-6 py-4 bg-card border-x border-b rounded-b-lg">
            {editingId === section.id ? (
              <SectionEditForm
                sectionId={section.id}
                initialTitle={section.title}
                initialContent={section.content}
                initialColor={section.colorPreset}
                initialHideFromSidebar={section.hideFromSidebar || false}
                onSave={(data) => handleSaveSection(section.id, data)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
                
                {isEditMode && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleEdit(section.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </Button>
                    <Button
                      onClick={() => handleDelete(section.id)}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card border-2 rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{category.title}</span>
            <span>/</span>
            <span className="text-foreground font-semibold">{subcategory.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{subcategory.title}</h1>
        </div>

        {isEditMode && (
          <div className="mb-6">
            <Button
              onClick={handleAddSection}
              className="w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter une section
            </Button>
          </div>
        )}

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <Accordion 
              type="multiple" 
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-4"
            >
              {sections.map((section, index) => (
                <SortableSection key={section.id} section={section} index={index} />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>

        {sections.length === 0 && (
          <div className="text-center py-12 bg-card border-2 rounded-lg">
            <p className="text-muted-foreground text-lg">
              Aucune section disponible pour cette catégorie
            </p>
          </div>
        )}
      </div>

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
