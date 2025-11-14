import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, ArrowLeft } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Category {
  id: string;
  title: string;
  icon: string;
  color_preset: string;
  scope: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  category_id: string;
  title: string;
  content: any;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface SortableAccordionItemProps {
  section: Section;
  isEditMode: boolean;
  isAuthenticated: boolean;
  onEdit: (section: Section) => void;
  onDelete: (sectionId: string) => void;
  editingId: string | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function SortableAccordionItem({
  section,
  isEditMode,
  isAuthenticated,
  onEdit,
  onDelete,
  editingId,
  onSave,
  onCancel,
}: SortableAccordionItemProps) {
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
    <AccordionItem
      ref={setNodeRef}
      style={style}
      value={section.id}
      className="border rounded-lg mb-2 bg-card"
    >
      <AccordionTrigger className="hover:no-underline px-4 py-3">
        <div className="flex items-center gap-3 w-full">
          {isEditMode && isAuthenticated && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <span className="text-left flex-1">{section.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {editingId === section.id ? (
          <SectionEditForm
            sectionId={section.id}
            initialTitle={section.title}
            initialContent={section.content}
            initialColor="blue"
            initialHideFromSidebar={false}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
            {isEditMode && isAuthenticated && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(section)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(section.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            )}
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export default function CategoryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  useEffect(() => {
    loadCategoryAndSections();
  }, [id]);

  const loadCategoryAndSections = async () => {
    if (!id) return;

    const supabaseAny = supabase as any;
    
    // Charger la catégorie
    const { data: cat, error: catError } = await supabaseAny
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (catError || !cat) {
      toast.error('Catégorie non trouvée');
      return;
    }

    setCategory(cat);

    // Charger les sections
    const { data: secs, error: secsError } = await supabaseAny
      .from('sections')
      .select('*')
      .eq('category_id', id)
      .order('display_order');

    if (!secsError && secs) {
      setSections(secs);
    }
  };

  const handleEdit = (section: Section) => {
    setEditingId(section.id);
  };

  const handleSave = async (data: any) => {
    if (!editingId) return;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('sections')
      .update({
        title: data.title,
        content: data.content,
      })
      .eq('id', editingId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    toast.success('Section mise à jour');
    setEditingId(null);
    loadCategoryAndSections();
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleAddSection = async (position: 'top' | 'bottom') => {
    if (!category) return;

    const newOrder = position === 'top'
      ? -1
      : sections.length > 0
      ? Math.max(...sections.map(s => s.display_order)) + 1
      : 0;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('sections')
      .insert({
        category_id: category.id,
        title: 'Nouvelle section',
        content: '<p>Contenu de la section...</p>',
        display_order: newOrder,
      });

    if (error) {
      toast.error('Erreur lors de l\'ajout');
      return;
    }

    toast.success('Section ajoutée');
    loadCategoryAndSections();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

    // Mettre à jour l'ordre dans la base de données
    const supabaseAny = supabase as any;
    for (let i = 0; i < reordered.length; i++) {
      await supabaseAny
        .from('sections')
        .update({ display_order: i })
        .eq('id', reordered[i].id);
    }

    toast.success('Ordre mis à jour');
  };

  const handleDeleteClick = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('sections')
      .delete()
      .eq('id', sectionToDelete);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Section supprimée');
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
    loadCategoryAndSections();
  };

  const getBackPath = () => {
    if (!category) return '/';
    if (category.scope === 'guide-apogee') return '/apogee';
    if (category.scope === 'apporteurs-nationaux') return '/guide-apporteurs';
    if (category.scope === 'informations-utiles') return '/help-confort';
    return '/';
  };

  if (!category) {
    return <div className="container max-w-4xl mx-auto p-8">Chargement...</div>;
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackPath())}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold">{category.title}</h1>
        </div>
        {isAuthenticated && (
          <Button
            variant={isEditMode ? "default" : "outline"}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? 'Terminer' : 'Éditer'}
          </Button>
        )}
      </div>

      {isEditMode && isAuthenticated && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddSection('top')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une section en haut
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
          <Accordion type="single" collapsible className="space-y-2">
            {sections.map(section => (
              isEditMode ? (
                <SortableAccordionItem
                  key={section.id}
                  section={section}
                  isEditMode={isEditMode}
                  isAuthenticated={isAuthenticated}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  editingId={editingId}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg mb-2 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline px-4 py-3">
                    <span className="text-left">{section.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </AccordionContent>
                </AccordionItem>
              )
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {isEditMode && isAuthenticated && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddSection('bottom')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une section en bas
          </Button>
        </div>
      )}

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
