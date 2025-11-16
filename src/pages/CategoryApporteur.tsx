// Page Category pour Apporteurs (utilise apporteur_blocks)
import { useParams, useLocation, Link } from 'react-router-dom';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, ChevronDown, FolderInput, Lightbulb, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { DocumentsList } from '@/components/DocumentsList';
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
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useApporteurEditor();
  const { isAuthenticated } = useAuth();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  const subcategory = blocks.find(b => b.type === 'subcategory' && b.slug === subslug);
  
  if (!category || !subcategory) {
    return <div className="container max-w-4xl mx-auto p-8">Page non trouvée</div>;
  }
  
  // Fonction pour obtenir l'icône d'un TIPS
  const getTipIcon = (hideFromSidebar: boolean) => {
    return hideFromSidebar ? '💡' : '';
  };
  
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
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);

  // Réinitialiser les filtres quand on change de sous-catégorie
  useEffect(() => {
    setShowTips(true);
    setShowSections(true);
  }, [slug, subslug]);

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

  const handleSaveSection = async (id: string, updates: any) => {
    // S'assurer que isSingleSection est bien passé
    const sectionUpdates = {
      ...updates,
      isSingleSection: updates.isSingleSection || false,
    };
    await updateBlock(id, sectionUpdates);
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

  const handleAddSection = async () => {
    await addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '',
      colorPreset: subcategory.colorPreset || 'blue',
      slug: `section-${Date.now()}`,
      parentId: subcategory.id,
      attachments: [],
      isSingleSection: false,
      order: sections.length,
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      
      // Calculer les nouveaux ordres en préservant l'ordre minimum
      const minOrder = Math.min(...sections.map(s => s.order));
      const sectionsWithNewOrder = reorderedSections.map((section, index) => ({
        ...section,
        order: minOrder + index
      }));
      
      // Utiliser reorderBlocks pour sauvegarder
      await reorderBlocks(sectionsWithNewOrder);
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

    // Si c'est une section figée OU un TIPS avec titre masqué, l'afficher sans accordéon
    if (section.isSingleSection || section.hideTitle) {
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
                          onClick={async () => await updateBlock(section.id, { parentId: sub.id })}
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
            {!section.hideTitle && section.title && section.title.trim() !== '' ? (
              <h3 className="text-lg font-semibold mb-4 text-foreground">{section.title}</h3>
            ) : !section.hideTitle && section.hideFromSidebar ? (
              <h3 className="text-lg font-semibold mb-4 text-foreground">💡 Information / Astuce</h3>
            ) : null}
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ 
                __html: section.hideTitle && section.hideFromSidebar
                  ? `<span style="font-size: 1.25rem; margin-right: 0.5rem;">${getTipIcon(section.hideFromSidebar)}</span>${section.content}`
                  : section.content 
              }}
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
                    {section.title}
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
                              onClick={async () => await updateBlock(section.id, { parentId: sub.id })}
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
              <Link to={`/apporteurs/category/${category.slug}`} className="hover:text-foreground transition-colors cursor-pointer">
                {category.title}
              </Link>
              <span>/</span>
              <span className="text-foreground font-semibold">{subcategory.title}</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">{subcategory.title}</h1>
          </div>

          <div className="mb-6 flex gap-3">
            {sections.some(s => s.hideFromSidebar) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showTips && !showSections) {
                    setShowSections(true);
                  }
                  setShowTips(!showTips);
                }}
                className="gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                {showTips ? 'Masquer les TIPS' : 'Afficher les TIPS'}
              </Button>
            )}
            {sections.some(s => !s.hideFromSidebar) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (showSections && !showTips) {
                    setShowTips(true);
                  }
                  setShowSections(!showSections);
                }}
                className="gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                {showSections ? 'Masquer les tutoriels' : 'Afficher les tutoriels'}
              </Button>
            )}
            {(showTips || showSections) && sections.filter(s => {
              const isTip = s.hideFromSidebar;
              if (isTip) return showTips;
              return showSections;
            }).filter(s => !s.isSingleSection && !s.hideTitle).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const visibleSections = sections.filter(section => {
                    const isTip = section.hideFromSidebar;
                    if (isTip) return showTips;
                    return showSections;
                  }).filter(s => !s.isSingleSection && !s.hideTitle);
                  
                  if (openAccordions.length === visibleSections.length) {
                    setOpenAccordions([]);
                  } else {
                    setOpenAccordions(visibleSections.map(s => s.slug));
                  }
                }}
                className="gap-2"
              >
                {openAccordions.length === sections.filter(s => {
                  const isTip = s.hideFromSidebar;
                  if (isTip) return showTips;
                  return showSections;
                }).filter(s => !s.isSingleSection && !s.hideTitle).length ? (
                  <>
                    <ChevronsUpDown className="w-4 h-4" />
                    Replier tout
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="w-4 h-4" />
                    Déplier tout
                  </>
                )}
              </Button>
            )}
          </div>

          {isEditMode && (
            <div className="mb-6 flex justify-end">
              <Button
                onClick={handleAddSection}
                size="sm"
                variant="ghost"
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
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
                {sections
                  .filter(section => {
                    const isTip = section.hideFromSidebar;
                    if (isTip) return showTips;
                    return showSections;
                  })
                  .map((section, index) => (
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

          <DocumentsList blockId={subcategory.id} scope="apporteur" />
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
