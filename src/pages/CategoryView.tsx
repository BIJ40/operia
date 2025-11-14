import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, FolderInput, ArrowLeft } from 'lucide-react';
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
import { useState, useEffect, useRef } from 'react';
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
  color_preset?: ColorPreset;
  hide_from_sidebar?: boolean;
  created_at: string;
  updated_at: string;
}

export default function CategoryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
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

  // Réinitialiser les accordéons ouverts quand on passe en mode édition/normal
  useEffect(() => {
    setOpenAccordions([]);
  }, [isEditMode]);

  // Ouvrir automatiquement la section depuis l'URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash)) {
      // Ouvrir l'accordéon de cette section
      setOpenAccordions(prev => {
        if (!prev.includes(hash)) {
          return [...prev, hash];
        }
        return prev;
      });
      
      // Scroller vers la section après un délai
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.scrollBy(0, -100);
        }
      }, 300);
    }
  }, [window.location.hash, sections]);

  // Préserver la position de scroll lors des changements d'onglet
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

    // Charger toutes les catégories du même scope
    const { data: cats, error: catsError } = await supabaseAny
      .from('categories')
      .select('*')
      .eq('scope', cat.scope)
      .order('display_order');

    if (!catsError && cats) {
      setCategories(cats);
    }

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

  const handleSave = async (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar: boolean;
  }) => {
    if (!editingId) return;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('sections')
      .update({
        title: data.title,
        content: data.content,
        color_preset: data.colorPreset,
        hide_from_sidebar: data.hideFromSidebar,
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

  const handleAddSection = async (position: 'top' | 'bottom' = 'bottom') => {
    if (!category) return;

    const newOrder = position === 'top'
      ? (sections[0]?.display_order ?? 0) - 1
      : (sections[sections.length - 1]?.display_order ?? 0) + 1;

    const supabaseAny = supabase as any;
    const { data, error } = await supabaseAny
      .from('sections')
      .insert({
        category_id: category.id,
        title: 'Nouvelle sous-section',
        content: '<p>Contenu de la sous-section...</p>',
        display_order: newOrder,
        color_preset: 'red',
        hide_from_sidebar: false,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }

    toast.success('Section ajoutée');
    await loadCategoryAndSections();
    
    if (data?.id) {
      setEditingId(data.id);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);

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

  const handleMoveSection = async (sectionId: string, newCategoryId: string) => {
    if (newCategoryId === category?.id) return;

    const supabaseAny = supabase as any;
    const targetCategory = categories.find(c => c.id === newCategoryId);
    
    if (!targetCategory) return;

    // Charger les sections de la catégorie cible
    const { data: targetSections } = await supabaseAny
      .from('sections')
      .select('*')
      .eq('category_id', newCategoryId)
      .order('display_order');

    const newOrder = targetSections && targetSections.length > 0
      ? Math.max(...targetSections.map((s: Section) => s.display_order)) + 1
      : 0;

    const { error } = await supabaseAny
      .from('sections')
      .update({
        category_id: newCategoryId,
        display_order: newOrder,
      })
      .eq('id', sectionId);

    if (error) {
      toast.error('Erreur lors du déplacement');
      return;
    }

    toast.success('Section déplacée');
    loadCategoryAndSections();
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-l-4 border-l-green-500';
      case 'yellow': return 'bg-yellow-50 border-l-4 border-l-yellow-500';
      case 'red': return 'bg-red-50 border-l-4 border-l-red-500';
      case 'blue': return 'bg-blue-50 border-l-4 border-l-blue-500';
      case 'purple': return 'bg-purple-50 border-l-4 border-l-purple-500';
      case 'pink': return 'bg-pink-50 border-l-4 border-l-pink-500';
      case 'orange': return 'bg-orange-50 border-l-4 border-l-orange-500';
      case 'cyan': return 'bg-cyan-50 border-l-4 border-l-cyan-500';
      case 'indigo': return 'bg-indigo-50 border-l-4 border-l-indigo-500';
      case 'teal': return 'bg-teal-50 border-l-4 border-l-teal-500';
      case 'rose': return 'bg-rose-50 border-l-4 border-l-rose-500';
      case 'gray': return 'bg-gray-50 border-l-4 border-l-gray-400';
      case 'blanc': return 'bg-white dark:bg-background border-l-4 border-l-border';
      case 'white': return 'bg-red-50 border-l-4 border-l-red-500';
      default: return 'bg-red-50 border-l-4 border-l-red-500';
    }
  };

  const SortableAccordionItem = ({ section }: { section: Section }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: section.id, disabled: editingId !== null });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms ease',
      opacity: isDragging ? 0.8 : 1,
      zIndex: isDragging ? 50 : 'auto',
    };

    return (
      <div ref={setNodeRef} style={style}>
        <AccordionItem value={section.id} id={section.id} className="mb-4">
          <div className={`rounded-lg ${getColorClass(section.color_preset)}`}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                {isEditMode && isAuthenticated && (
                  <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <span className="text-left flex-1 font-medium">{section.title}</span>
                {isEditMode && isAuthenticated && editingId !== section.id && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <FolderInput className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {categories
                          .filter(c => c.id !== category?.id)
                          .map(c => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() => handleMoveSection(section.id, c.id)}
                            >
                              Déplacer vers "{c.title}"
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(section);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(section.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              {editingId === section.id ? (
                <SectionEditForm
                  sectionId={section.id}
                  initialTitle={section.title}
                  initialContent={section.content}
                  initialColor={(section.color_preset as ColorPreset) || 'red'}
                  initialHideFromSidebar={section.hide_from_sidebar || false}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              )}
            </AccordionContent>
          </div>
        </AccordionItem>
      </div>
    );
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
        <div className="mb-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddSection('top')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter en haut
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddSection('bottom')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter en bas
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
            className="space-y-2"
            value={openAccordions}
            onValueChange={setOpenAccordions}
          >
            {sections.map(section => (
              <SortableAccordionItem key={section.id} section={section} />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {sections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune section pour le moment.</p>
          {isEditMode && isAuthenticated && (
            <p className="mt-2">Cliquez sur "Ajouter" pour créer votre première section.</p>
          )}
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
