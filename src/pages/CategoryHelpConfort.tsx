import { useParams, useNavigate } from 'react-router-dom';
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
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
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
import { supabase } from '@/integrations/supabase/client';

interface Section {
  id: string;
  category_id: string;
  title: string;
  content: any;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  color_preset: string;
  scope: string;
  display_order: number;
}

interface SortableSectionProps {
  section: Section;
  isEditMode: boolean;
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  openAccordions: string[];
  onAccordionChange: (value: string[]) => void;
}

function SortableSection({
  section,
  isEditMode,
  onEdit,
  onDelete,
  openAccordions,
  onAccordionChange,
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

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return <div>{JSON.stringify(content)}</div>;
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <AccordionItem value={section.id} className="border rounded-lg bg-card">
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
          <AccordionTrigger className="flex-1 hover:no-underline">
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
          <div className="prose prose-sm max-w-none">
            {renderContent(section.content)}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

export default function CategoryHelpConfort() {
  const { slug } = useParams();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

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

  // Load category
  useEffect(() => {
    loadCategory();
  }, [slug]);

  // Load sections when category changes
  useEffect(() => {
    if (category) {
      loadSections();
    }
  }, [category]);

  const loadCategory = async () => {
    if (!slug) return;

    const categorySlug = slug.replace('helpconfort-', '');
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('scope', 'helpconfort')
      .ilike('title', `%${categorySlug.replace(/-/g, ' ')}%`)
      .single();

    if (error) {
      console.error('Error loading category:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la catégorie',
        variant: 'destructive',
      });
      return;
    }

    setCategory(data);
  };

  const loadSections = async () => {
    if (!category) return;

    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('category_id', category.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading sections:', error);
      return;
    }

    setSections(data || []);
  };

  const handleAddSection = async () => {
    if (!category) return;

    const maxOrder = sections.length > 0 
      ? Math.max(...sections.map(s => s.display_order))
      : -1;

    const { data, error } = await supabase
      .from('sections')
      .insert({
        category_id: category.id,
        title: 'Nouvelle section',
        content: '<p>Contenu de la section...</p>',
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la section',
        variant: 'destructive',
      });
      return;
    }

    setSections([...sections, data]);
    setEditingSection(data);
    setEditTitle(data.title);
    const contentStr = typeof data.content === 'string' 
      ? data.content 
      : (data.content ? JSON.stringify(data.content) : '');
    setEditContent(contentStr);
    setEditDialogOpen(true);
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setEditTitle(section.title);
    const contentStr = typeof section.content === 'string' 
      ? section.content 
      : (section.content ? JSON.stringify(section.content) : '');
    setEditContent(contentStr);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingSection) return;

    const { error } = await supabase
      .from('sections')
      .update({
        title: editTitle,
        content: editContent,
      })
      .eq('id', editingSection.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la section',
        variant: 'destructive',
      });
      return;
    }

    await loadSections();
    setEditDialogOpen(false);
    setEditingSection(null);
    
    toast({
      title: 'Section sauvegardée',
      description: 'Les modifications ont été enregistrées',
    });
  };

  const handleDeleteClick = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', sectionToDelete);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la section',
        variant: 'destructive',
      });
      return;
    }

    setSections(sections.filter(s => s.id !== sectionToDelete));
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
    
    toast({
      title: 'Section supprimée',
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      
      // Update display_order for all sections
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        display_order: index,
      }));

      setSections(reorderedSections);

      // Save to database
      for (const update of updates) {
        await supabase
          .from('sections')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    }
  };

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{category.title}</h1>
        
        {isAdmin && (
          <div className="flex gap-2 mt-4">
            <Button
              variant={isEditMode ? "default" : "outline"}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "Mode normal" : "Mode édition"}
            </Button>
            {isEditMode && (
              <Button onClick={handleAddSection}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une section
              </Button>
            )}
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
                  onAccordionChange={setOpenAccordions}
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Titre</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Titre de la section"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Contenu</label>
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                Sauvegarder
              </Button>
            </div>
          </div>
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
