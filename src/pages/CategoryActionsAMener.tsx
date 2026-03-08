import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, ChevronDown } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import * as Icons from 'lucide-react';
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
import { RichTextEditor } from '@/components/RichTextEditor';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SortableSectionProps {
  section: any;
  category: any;
  isEditMode: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  isOpen: boolean;
}

const SortableSection = ({ section, category, isEditMode, onEdit, onDelete, onContentChange, isOpen }: SortableSectionProps) => {
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
      <AccordionItem value={section.id} className="border-2 border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300">
        <div className="relative group">
          {isEditMode && (
            <>
              <div
                {...attributes}
                {...listeners}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
              >
                <div className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </div>
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => onEdit(section.id)}
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => onDelete(section.id)}
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
          <AccordionTrigger className={`px-6 py-4 hover:no-underline ${isEditMode ? 'pl-12 pr-24' : ''}`}>
            <span className="text-left font-semibold text-lg text-foreground">{section.title}</span>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-6 pt-2 pb-4">
          {isEditMode ? (
            <RichTextEditor
              content={section.content || ''}
              onChange={(content) => onContentChange(section.id, content)}
            />
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={createSanitizedHtml(section.content || '')}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default function CategoryActionsAMener() {
  const { slug } = useParams();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useEditor();
  const { isAuthenticated, hasGlobalRole, hasModuleOption } = useAuth();
  // P0: Utiliser V2 pour permissions d'édition
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('guides', 'edition');
  const { toast } = useToast();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug && b.slug.startsWith('actions-a-mener-'));
  
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

  // Ouvrir automatiquement la section depuis l'URL hash
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
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [location.hash, category, sections]);

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Icons.AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Catégorie introuvable</h1>
          <p className="text-muted-foreground">Cette catégorie n'existe pas</p>
        </div>
      </div>
    );
  }

  const handleAddSection = () => {
    addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '',
      parentId: category.id,
      slug: `section-${Date.now()}`,
      attachments: [],
      order: sections.length,
      colorPreset: 'blue',
      icon: 'FileText',
    });
  };

  const handleEdit = (sectionId: string) => {
    setEditingId(sectionId);
    setEditDialogOpen(true);
  };

  const handleDelete = (sectionId: string) => {
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

  const handleContentChange = (sectionId: string, content: string) => {
    updateBlock(sectionId, { content });
  };

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

  const handleAccordionChange = (value: string | string[]) => {
    if (Array.isArray(value)) {
      setOpenAccordions(value);
    } else {
      setOpenAccordions([value]);
    }
  };

  const editingSection = editingId ? blocks.find(b => b.id === editingId) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-helpconfort-blue-dark to-helpconfort-blue-lighter bg-clip-text text-transparent">
            {category.title}
          </h1>
        </div>

        {sections.length === 0 && !isEditMode && (
          <div className="text-center py-16">
            <Icons.FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">
              Aucune section pour le moment
            </p>
            <p className="text-sm text-muted-foreground">
              Les sections seront ajoutées par un administrateur
            </p>
          </div>
        )}

        {sections.length > 0 && (
          <div>
            {isEditMode ? (
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
                    onValueChange={handleAccordionChange}
                    className="w-full"
                  >
                    {sections.map((section) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        category={category}
                        isEditMode={isEditMode}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onContentChange={handleContentChange}
                        isOpen={openAccordions.includes(section.id)}
                      />
                    ))}
                  </Accordion>
                </SortableContext>
              </DndContext>
            ) : (
              <Accordion 
                type="multiple" 
                value={openAccordions}
                onValueChange={handleAccordionChange}
                className="w-full"
              >
                {sections.map((section) => (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id} 
                    id={section.id}
                    className="border-2 border-gray-200 rounded-xl mb-3 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <span className="text-left font-semibold text-lg text-foreground">{section.title}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pt-2 pb-4">
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={createSanitizedHtml(section.content || '')}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        )}

        {isEditMode && canEdit && (
          <div className="flex justify-center mt-8">
            <Button onClick={handleAddSection} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une section
            </Button>
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier la section</DialogTitle>
            </DialogHeader>
            {editingSection && (
              <SectionEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content || ''}
                initialColor={editingSection.colorPreset || 'blue'}
                initialSummary={editingSection.summary}
                initialShowSummary={editingSection.showSummary}
                initialHideTitle={editingSection.hideTitle}
                initialHideFromSidebar={editingSection.hideFromSidebar}
                onSave={(updates) => {
                  updateBlock(editingSection.id, updates);
                  setEditDialogOpen(false);
                  setEditingId(null);
                }}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditingId(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement cette section. Cette action est irréversible.
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
    </div>
  );
}
