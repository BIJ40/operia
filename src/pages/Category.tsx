// Force update - color fix for blanc/white
import { useParams, useLocation } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
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
  
  if (!category) {
    return <div className="container max-w-4xl mx-auto p-8">Catégorie non trouvée</div>;
  }
  
  // Liste des catégories disponibles (exclure FAQ)
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
      .sort((a, b) => a.order - b.order),
    [blocks]
  );
  
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
  const savedScrollPositionRef = useRef<number>(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Ouvrir automatiquement la section depuis l'URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash)) {
      // Ouvrir l'accordéon de cette section
      setOpenAccordions(prev => {
        if (!prev.includes(hash)) {
          return [...prev, hash];
        }
        return prev;
      });
      
      // Scroller vers la section après un délai pour laisser l'accordéon s'ouvrir
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
  }, [location.hash, sections]);

  // Réinitialiser les accordéons ouverts quand on passe en mode édition/normal
  useEffect(() => {
    setOpenAccordions([]);
  }, [isEditMode]);

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

  const handleMoveToCategory = (sectionId: string, newCategoryId: string) => {
    // Récupérer les sections de la nouvelle catégorie
    const newCategorySections = blocks
      .filter(b => b.type === 'section' && b.parentId === newCategoryId)
      .sort((a, b) => a.order - b.order);
    
    // Placer la section en haut de la nouvelle catégorie
    const newOrder = newCategorySections.length > 0 
      ? newCategorySections[0].order - 1 
      : 0;
    
    updateBlock(sectionId, {
      parentId: newCategoryId,
      order: newOrder
    });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleAddSection = (position: 'top' | 'bottom' = 'bottom') => {
    if (!category) return;
    
    // Calculer l'ordre AVANT d'ajouter la section
    const newOrder = position === 'top' 
      ? (sections[0]?.order ?? 0) - 1
      : (sections[sections.length - 1]?.order ?? 0) + 1;
    
    // addBlock retourne maintenant l'ID du nouveau block
    const newBlockId = addBlock({
      type: 'section',
      title: 'Nouvelle sous-section',
      content: '<p>Contenu de la sous-section...</p>',
      colorPreset: 'red',
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: [],
    });
    
    if (newBlockId) {
      // Mettre à jour l'ordre et ouvrir en mode édition
      setTimeout(() => {
        updateBlock(newBlockId, { order: newOrder });
        setEditingId(newBlockId);
      }, 50);
    }
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

  // Composant d'accordéon triable
  const SortableAccordionItem = ({ section }: { section: typeof sections[0] }) => {
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
      <div ref={setNodeRef} style={style} className="relative">
        <AccordionItem value={section.id} id={section.id} className="mb-4">
          <div className={`rounded-lg ${getColorClass(section.colorPreset)}`}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                <h2 className="text-xl font-semibold text-left">
                  {section.hideFromSidebar ? "💡 Info / Astuce" : section.title}
                </h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
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
                <div
                  className="prose prose-sm max-w-none break-words overflow-visible"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              )}
            </AccordionContent>
          </div>
        </AccordionItem>
        {isEditMode && isAuthenticated && (
          <div 
            className="absolute top-4 right-6 flex gap-2 z-[60] bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              className="cursor-move pointer-events-auto"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Changer de catégorie"
                  className="pointer-events-auto"
                >
                  <FolderInput className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border shadow-md z-[100]">
                {availableCategories
                  .filter(cat => cat.id !== category?.id)
                  .map((cat) => (
                    <DropdownMenuItem
                      key={cat.id}
                      onClick={() => handleMoveToCategory(section.id, cat.id)}
                    >
                      {cat.title}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="ghost"
              className="pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleEdit(section);
              }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDeleteClick(section.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
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
            <Accordion 
              type="multiple" 
              className="w-full"
              value={openAccordions}
              onValueChange={setOpenAccordions}
            >
              {sections.map((section) => 
                isEditMode ? (
                  <SortableAccordionItem key={section.id} section={section} />
                ) : (
                  <AccordionItem key={section.id} value={section.id} id={section.id} className="mb-4">
                    <div className={`rounded-lg ${getColorClass(section.colorPreset)}`}>
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                          <h2 className="text-xl font-semibold text-left">
                            {section.hideFromSidebar ? "💡 Info / Astuce" : section.title}
                          </h2>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div
                          className="prose prose-sm max-w-none break-words overflow-visible"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                )
              )}
            </Accordion>
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
