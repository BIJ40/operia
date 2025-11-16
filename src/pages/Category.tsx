// Force update - color fix for blanc/white
import { useParams, useLocation } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { saveAppData } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, ChevronDown, FolderInput, Copy, Info } from 'lucide-react';
import { DocumentsList } from '@/components/DocumentsList';
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
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
import { TipsEditForm } from '@/components/TipsEditForm';
import { ColorPreset, TipsType } from '@/types/block';
import { Lightbulb } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Category() {
  const { slug } = useParams();
  const location = useLocation();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useEditor();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  // Ouvrir automatiquement la section depuis l'URL hash
  useEffect(() => {
    if (!category) return;
    
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
  }, [location.hash, sections, category]);

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

  // Early return AFTER all hooks
  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleEdit = (block: typeof sections[0]) => {
    setEditingId(block.id);
    // Ouvrir l'accordéon de cette section
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
    hideFromSidebar: boolean;
    isSingleSection?: boolean;
  }) => {
    if (editingId) {
      // Sauvegarder la position de scroll IMMÉDIATEMENT
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      
      // Sauvegarder et supprimer temporairement le hash pour éviter le scroll automatique
      const currentHash = window.location.hash;
      if (currentHash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      updateBlock(editingId, data);

      // Fermer le dialog et restaurer immédiatement
      setEditDialogOpen(false);
      setEditingId(null);
      
      // Restaurer plusieurs fois pour être sûr
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPos);
        setTimeout(() => {
          window.scrollTo(0, scrollPos);
          // Remettre le hash après la restauration du scroll
          if (currentHash) {
            history.replaceState(null, '', window.location.pathname + window.location.search + currentHash);
          }
        }, 0);
        setTimeout(() => window.scrollTo(0, scrollPos), 50);
        setTimeout(() => window.scrollTo(0, scrollPos), 100);
      });
    }
  };

  const handleSaveTips = async (
    title: string,
    content: string,
    tipsType: TipsType,
    hideFromSidebar: boolean
  ) => {
    if (editingId) {
      // Sauvegarder la position de scroll IMMÉDIATEMENT
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      
      // Sauvegarder et supprimer temporairement le hash pour éviter le scroll automatique
      const currentHash = window.location.hash;
      if (currentHash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      const colorMap: Record<TipsType, ColorPreset> = {
        danger: 'red',
        warning: 'orange',
        success: 'green',
        information: 'blue',
      };

      updateBlock(editingId, {
        title,
        content,
        colorPreset: colorMap[tipsType],
        hideFromSidebar,
        tipsType,
        contentType: 'tips',
      });

      // Fermer le dialog et restaurer immédiatement
      setEditDialogOpen(false);
      setEditingId(null);
      
      // Restaurer plusieurs fois pour être sûr
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPos);
        setTimeout(() => {
          window.scrollTo(0, scrollPos);
          // Remettre le hash après la restauration du scroll
          if (currentHash) {
            history.replaceState(null, '', window.location.pathname + window.location.search + currentHash);
          }
        }, 0);
        setTimeout(() => window.scrollTo(0, scrollPos), 50);
        setTimeout(() => window.scrollTo(0, scrollPos), 100);
      });
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

  const handleAddSection = async (afterSectionId?: string) => {
    if (!category) return;
    
    let newOrder: number;
    
    if (afterSectionId) {
      // Insérer après la section spécifiée
      const afterSection = sections.find(s => s.id === afterSectionId);
      const afterIndex = sections.findIndex(s => s.id === afterSectionId);
      
      if (afterIndex === sections.length - 1) {
        // Si c'est la dernière section, ajouter après
        newOrder = afterSection!.order + 1;
      } else {
        // Sinon, prendre la moyenne entre cette section et la suivante
        const nextSection = sections[afterIndex + 1];
        newOrder = Math.floor((afterSection!.order + nextSection.order) / 2);
      }
    } else {
      // Sans afterSectionId, ajouter au début
      newOrder = sections.length > 0 
        ? sections[0].order - 1 
        : 0;
    }
    
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

  const handleAddTips = async (afterSectionId?: string) => {
    if (!category) return;
    
    let newOrder: number;
    
    if (afterSectionId) {
      // Insérer après la section spécifiée
      const afterSection = sections.find(s => s.id === afterSectionId);
      const afterIndex = sections.findIndex(s => s.id === afterSectionId);
      
      if (afterIndex === sections.length - 1) {
        // Si c'est la dernière section, ajouter après
        newOrder = afterSection!.order + 1;
      } else {
        // Sinon, prendre la moyenne entre cette section et la suivante
        const nextSection = sections[afterIndex + 1];
        newOrder = Math.floor((afterSection!.order + nextSection.order) / 2);
      }
    } else {
      // Sans afterSectionId, ajouter au début
      newOrder = sections.length > 0 
        ? sections[0].order - 1 
        : 0;
    }
    
    const newBlockId = await addBlock({
      type: 'section',
      title: 'ℹ️ Information',
      content: '<p>Contenu du TIPS...</p>',
      colorPreset: 'blue',
      parentId: category.id,
      slug: `${category.slug}-tips-${Date.now()}`,
      attachments: [],
      contentType: 'tips',
      tipsType: 'information',
      hideFromSidebar: true,
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

  const handleDuplicate = async (sectionId: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate) return;

    // Calculer le nouvel ordre (juste après la section actuelle)
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    const nextSection = sections[currentIndex + 1];
    const newOrder = nextSection 
      ? (sectionToDuplicate.order + nextSection.order) / 2
      : sectionToDuplicate.order + 1;

    // Créer la nouvelle section dupliquée
    const newBlockId = await addBlock({
      type: 'section',
      title: `${sectionToDuplicate.title} (copie)`,
      content: sectionToDuplicate.content,
      colorPreset: sectionToDuplicate.colorPreset,
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: sectionToDuplicate.attachments || [],
      hideFromSidebar: sectionToDuplicate.hideFromSidebar,
      order: newOrder,
    });

    if (newBlockId) {
      // Mettre à jour l'ordre
      setTimeout(async () => {
        await updateBlock(newBlockId, { order: newOrder });
        toast({ 
          title: 'Section dupliquée', 
          description: 'La section a été dupliquée avec succès' 
        });
      }, 50);
    }
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
      case 'white': return 'bg-purple-50 border-l-4 border-l-purple-500'; // White ancien = violet
      default: return 'bg-purple-50 border-l-4 border-l-purple-500'; // Violet par défaut
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

    // Si c'est une section figée, l'afficher sans accordéon
    if (section.isSingleSection) {
      return (
        <div ref={setNodeRef} style={style} className="mb-4">
          <div className={`rounded-lg relative ${getColorClass(section.colorPreset)} p-6`}>
            {isEditMode && isAuthenticated && (
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  title="Insérer une section après"
                  onClick={() => handleAddSection(section.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  title="Insérer un TIPS après"
                  onClick={() => handleAddTips(section.id)}
                >
                  <Lightbulb className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(section.id);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  title="Dupliquer la section"
                  onClick={() => handleDuplicate(section.id)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Changer de catégorie"
                    >
                      <FolderInput className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border shadow-md z-[200]">
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
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteClick(section.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            {section.title && section.title.trim() !== '' ? (
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
            ) : section.hideFromSidebar ? (
              <h3 className="text-lg font-semibold mb-4">💡 Info / Astuce</h3>
            ) : null}
            <div
              className="prose prose-sm max-w-none break-words overflow-visible"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </div>
        </div>
      );
    }

    return (
      <div ref={setNodeRef} style={style}>
        <AccordionItem value={section.id} id={section.id} className="mb-4">
          <div className={`rounded-lg relative ${getColorClass(section.colorPreset)}`}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1">
                  {section.showSummary && section.summary ? (
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div 
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 shrink-0 cursor-help"
                          onClick={(e) => {
                            if (isEditMode && isAuthenticated) {
                              e.stopPropagation();
                              e.preventDefault();
                              setEditingId(section.id);
                              setEditDialogOpen(true);
                            }
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-[500px] bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" side="right">
                        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{section.summary}</p>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  )}
                  <h2 className="text-xl font-semibold text-left">
                    {section.title}
                  </h2>
                </div>
                {isEditMode && isAuthenticated && (
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Insérer une section après"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddSection(section.id);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Insérer un TIPS après"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddTips(section.id);
                      }}
                    >
                      <Lightbulb className="w-4 h-4" />
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
                        setEditingId(section.id);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      title="Dupliquer la section"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDuplicate(section.id);
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          title="Changer de catégorie"
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
                      type="button"
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
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
      <div className="container max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{category.title}</h1>
          {isEditMode && isAuthenticated && (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAddSection()} 
                size="icon"
                variant="ghost"
                title="Ajouter une section au début"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => handleAddTips()} 
                size="icon"
                variant="ghost"
                title="Ajouter un TIPS au début"
              >
                <Lightbulb className="w-4 h-4" />
              </Button>
            </div>
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
                          {section.showSummary && section.summary ? (
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 shrink-0 cursor-help">
                                  <Info className="h-4 w-4" />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-[500px] bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" side="right">
                                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{section.summary}</p>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                          )}
                          <h2 className="text-xl font-semibold text-left">
                            {section.title}
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

        <DocumentsList blockId={category.id} scope="apogee" />
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen} modal={true}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            // Restaurer le scroll quand le dialog se ferme
            const scrollPos = savedScrollPositionRef.current;
            setTimeout(() => window.scrollTo(0, scrollPos), 0);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingId && sections.find(s => s.id === editingId)?.contentType === 'tips' 
                ? 'Modifier le TIPS' 
                : 'Modifier la section'}
            </DialogTitle>
          </DialogHeader>
          {editingId && sections.find(s => s.id === editingId)?.contentType === 'tips' ? (
            <TipsEditForm
              sectionId={editingId}
              initialTitle={sections.find(s => s.id === editingId)?.title || ''}
              initialContent={sections.find(s => s.id === editingId)?.content || ''}
              initialTipsType={sections.find(s => s.id === editingId)?.tipsType || 'information'}
              initialHideFromSidebar={sections.find(s => s.id === editingId)?.hideFromSidebar ?? true}
              onSave={handleSaveTips}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingId(null);
              }}
            />
          ) : editingId ? (
            <SectionEditForm
              sectionId={editingId}
              initialTitle={sections.find(s => s.id === editingId)?.title || ''}
              initialContent={sections.find(s => s.id === editingId)?.content || ''}
              initialColor={sections.find(s => s.id === editingId)?.colorPreset || 'blue'}
              initialHideFromSidebar={sections.find(s => s.id === editingId)?.hideFromSidebar || false}
              initialIsSingleSection={sections.find(s => s.id === editingId)?.isSingleSection || false}
              initialSummary={sections.find(s => s.id === editingId)?.summary || ''}
              initialShowSummary={sections.find(s => s.id === editingId)?.showSummary ?? true}
              onSave={handleSave}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingId(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
