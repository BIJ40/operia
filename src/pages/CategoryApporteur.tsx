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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
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
    setEditingId(id);
    setEditDialogOpen(true);
  };

  const handleSaveSection = (id: string, updates: any) => {
    updateBlock(id, updates);
    setEditingId(null);
    setEditDialogOpen(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDialogOpen(false);
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
    } = useSortable({ id: section.id, disabled: editingId !== null });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 200ms ease',
      opacity: isDragging ? 0.8 : 1,
      zIndex: isDragging ? 50 : 'auto',
    };

    // Si c'est une section figée, l'afficher sans accordéon
    if (section.isSingleSection) {
      return (
        <div ref={setNodeRef} style={style} className="mb-4">
          <div className="rounded-lg relative bg-card border-2 p-6 shadow-sm">
            {isEditMode && (
              <div className="absolute top-2 right-2 flex gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="cursor-move"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Changer de sous-catégorie"
                    >
                      <FolderInput className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-md z-[200]">
                    {availableSubcategories
                      .filter(sub => sub.id !== subcategory?.id)
                      .map((sub) => (
                        <DropdownMenuItem
                          key={sub.id}
                          onClick={() => updateBlock(section.id, { parentId: sub.id })}
                        >
                          {sub.title}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(section.id)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(section.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </div>
        </div>
      );
    }

    // Affichage normal avec accordéon
    return (
      <div ref={setNodeRef} style={style}>
        <AccordionItem value={section.slug} id={section.slug} className="mb-4">
          <div className="rounded-lg relative bg-card border-2">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1">
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  <h2 className="text-xl font-semibold text-left">
                    {section.hideFromSidebar ? "💡 Info / Astuce" : section.title}
                  </h2>
                </div>
                {isEditMode && (
                  <div 
                    className="flex gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="cursor-move"
                      {...attributes}
                      {...listeners}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <GripVertical className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title="Changer de sous-catégorie"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <FolderInput className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-md z-[200]">
                        {availableSubcategories
                          .filter(sub => sub.id !== subcategory?.id)
                          .map((sub) => (
                            <DropdownMenuItem
                              key={sub.id}
                              onClick={() => updateBlock(section.id, { parentId: sub.id })}
                            >
                              {sub.title}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleEdit(section.id);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDelete(section.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
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
      </div>
    );
  };

  return (
    <>
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
                Aucune section disponible pour cette sous-catégorie
              </p>
            </div>
          )}
        </div>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la section</DialogTitle>
          </DialogHeader>
          {editingId && (
            <SectionEditForm
              sectionId={editingId}
              initialTitle={sections.find(s => s.id === editingId)?.title || ''}
              initialContent={sections.find(s => s.id === editingId)?.content || ''}
              initialColor={sections.find(s => s.id === editingId)?.colorPreset || 'blue'}
              initialHideFromSidebar={sections.find(s => s.id === editingId)?.hideFromSidebar || false}
              initialIsSingleSection={sections.find(s => s.id === editingId)?.isSingleSection || false}
              onSave={(data) => handleSaveSection(editingId, data)}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
