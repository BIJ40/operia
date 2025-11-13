// Force update - color fix for blanc/white
import { useParams, useLocation } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/RichTextEditor';
import { SectionEditForm } from '@/components/SectionEditForm';
import { ColorPreset } from '@/types/block';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function Category() {
  const { slug } = useParams();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  
  // Mémoriser sections pour éviter les recalculs qui causent des scrolls
  const sections = useMemo(() => 
    blocks
      .filter(b => b.type === 'section' && b.parentId === category?.id)
      .sort((a, b) => a.order - b.order),
    [blocks, category?.id]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [hasScrolledOnMount, setHasScrolledOnMount] = useState(false);
  const savedScrollPositionRef = useRef<number>(0);

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

  // Préserver la position de scroll lors des changements d'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Sauvegarder la position avant de quitter
        savedScrollPositionRef.current = window.scrollY;
      } else {
        // Restaurer la position au retour
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

  // Sauvegarder la position de scroll périodiquement pour éviter les pertes
  useEffect(() => {
    const saveScrollPosition = () => {
      if (editingId) {
        savedScrollPositionRef.current = window.scrollY;
      }
    };

    const intervalId = setInterval(saveScrollPosition, 1000);
    return () => clearInterval(intervalId);
  }, [editingId]);

  // Scroll to section if hash is present UNIQUEMENT au chargement initial
  // Ne se déclenche qu'UNE SEULE FOIS pour éviter les scrolls intempestifs pendant l'édition
  useEffect(() => {
    if (location.hash && !hasScrolledOnMount) {
      const sectionId = location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setHasScrolledOnMount(true);
        }
      }, 300);
    }
  }, []); // Tableau vide = s'exécute UNE SEULE FOIS au montage

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleEdit = (block: typeof sections[0]) => {
    setEditingId(block.id);
  };

  const handleSave = (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar: boolean;
  }) => {
    if (editingId) {
      updateBlock(editingId, data);
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleAddSection = (position: 'top' | 'bottom' = 'bottom') => {
    const newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    addBlock({
      type: 'section',
      title: 'Nouvelle sous-section',
      content: '<p>Contenu de la sous-section...</p>',
      colorPreset: 'red',
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: [],
    });
    
    // Définir l'ordre correct et ouvrir en mode édition
    setTimeout(() => {
      const allSections = blocks
        .filter(b => b.type === 'section' && b.parentId === category?.id)
        .sort((a, b) => a.order - b.order);
      
      const targetSection = allSections[allSections.length - 1]; // La nouvelle section (dernière ajoutée)
      
      if (targetSection) {
        // Définir le bon order selon la position
        const newOrder = position === 'top' 
          ? (sections[0]?.order ?? 0) - 1
          : (sections[sections.length - 1]?.order ?? 0) + 1;
        
        updateBlock(targetSection.id, { order: newOrder });
        setEditingId(targetSection.id);
      }
    }, 100);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      
      // Mettre à jour l'ordre de chaque section
      reorderedSections.forEach((section, index) => {
        updateBlock(section.id, { order: index });
      });
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
      case 'white': return 'bg-red-50 border-l-4 border-l-red-500'; // White ancien = rouge
      default: return 'bg-red-50 border-l-4 border-l-red-500'; // Rouge par défaut
    }
  };

  // Composant de section triable
  const SortableSection = ({ section }: { section: typeof sections[0] }) => {
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
      cursor: isDragging ? 'grabbing' : 'default',
      // Préserver la largeur pendant le drag
      width: isDragging ? '100%' : 'auto',
      maxWidth: isDragging ? 'calc(100% - 4rem)' : 'none',
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        id={section.id}
        tabIndex={-1}
        className={`mb-8 p-6 rounded-lg transition-all duration-200 ${getColorClass(section.colorPreset)} focus:outline-none ${
          isDragging ? 'shadow-2xl scale-[1.02] ring-2 ring-primary bg-opacity-95' : ''
        }`}
      >
        {editingId === section.id ? (
          <SectionEditForm
            sectionId={section.id}
            initialTitle={section.title}
            initialContent={section.content}
            initialColor={section.colorPreset || 'red'}
            initialHideFromSidebar={section.hideFromSidebar || false}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              {!section.hideFromSidebar && (
                <h2 className="text-2xl font-semibold">{section.title}</h2>
              )}
              {isEditMode && isAuthenticated && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="cursor-move"
                    {...attributes}
                    {...listeners}
                  >
                    <GripVertical className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(section)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(section.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none break-words overflow-visible"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="container max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{category.title}</h1>
          {isEditMode && isAuthenticated && (
            <Button 
              onClick={() => handleAddSection('top')} 
              size="sm"
              variant="ghost"
              className="ml-4"
              title="Ajouter une section en haut"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <SortableSection key={section.id} section={section} />
            ))}
          </SortableContext>
        </DndContext>

        {isEditMode && isAuthenticated && (
          <div className="mt-8 flex justify-center">
            <Button 
              onClick={() => handleAddSection('bottom')} 
              size="sm"
              variant="ghost"
              title="Ajouter une section en bas"
            >
              <Plus className="w-4 h-4" />
            </Button>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
