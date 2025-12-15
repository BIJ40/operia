import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  ExternalLink,
  GraduationCap,
  SkipForward,
  X,
  Pencil,
  Save,
  XCircle,
  Trash2,
  ChevronsUpDown,
  Grip
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useFormationContentList, useUpdateFormationContent, useDeleteFormationContent, useReorderFormationContent, FormationContent } from "@/hooks/useFormationContent";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// Component to render summary with inline images at their correct positions
function FormationContentWithImages({ 
  summary, 
  images, 
  onImageClick 
}: { 
  summary: string; 
  images: string[]; 
  onImageClick: (url: string) => void;
}) {
  // Split content by image markers and render with actual images
  const parts = summary.split(/(\[IMAGE_\d+\])/g);
  
  return (
    <>
      {parts.map((part, idx) => {
        const imageMatch = part.match(/\[IMAGE_(\d+)\]/);
        if (imageMatch) {
          const imageIndex = parseInt(imageMatch[1], 10);
          const imageUrl = images[imageIndex];
          if (imageUrl) {
            return (
              <div key={idx} className="my-6 flex justify-center">
                <button
                  onClick={() => onImageClick(imageUrl)}
                  className="block border rounded-lg overflow-hidden hover:ring-2 ring-helpconfort-blue transition-all shadow-sm"
                >
                  <img 
                    src={imageUrl} 
                    alt={`Illustration ${imageIndex + 1}`}
                    className="max-w-full max-h-96 w-auto object-contain bg-muted"
                  />
                </button>
              </div>
            );
          }
          return null;
        }
        // Render markdown for text parts
        if (part.trim()) {
          return <ReactMarkdown key={idx}>{part}</ReactMarkdown>;
        }
        return null;
      })}
    </>
  );
}

interface Category {
  id: string;
  title: string;
  order: number;
}

export default function FormationApogee() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FormationContent | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedSections(new Set(currentCategoryContent.map(c => c.id)));
  };

  const expandAll = () => {
    setCollapsedSections(new Set());
  };

  const updateMutation = useUpdateFormationContent();
  const deleteMutation = useDeleteFormationContent();
  const reorderMutation = useReorderFormationContent();

  const handleStartEdit = (content: FormationContent) => {
    setEditingId(content.id);
    setEditContent(content.generated_summary || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (id: string) => {
    await updateMutation.mutateAsync({ id, summary: editContent });
    setEditingId(null);
    setEditContent("");
  };

  const handleDeleteClick = (content: FormationContent) => {
    setItemToDelete(content);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteMutation.mutateAsync(itemToDelete.id);
      setItemToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleMoveSection = (direction: "up" | "down", currentIndex: number) => {
    reorderMutation.mutate({ 
      items: currentCategoryContent, 
      direction, 
      currentIndex 
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle presentation mode close
  const closePresentationMode = () => {
    setIsFullscreen(false);
    setPresentationMode(false);
  };

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["blocks-categories-formation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, title, order")
        .eq("type", "category")
        .order("order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    }
  });

  const { data: allFormationContent, isLoading } = useFormationContentList();

  // Filter content that is complete
  const formationContent = useMemo(() => {
    return allFormationContent?.filter(fc => fc.status === "complete") || [];
  }, [allFormationContent]);

  // Group by category
  const contentByCategory = useMemo(() => {
    const map = new Map<string, FormationContent[]>();
    formationContent.forEach(fc => {
      if (fc.source_category_id) {
        const existing = map.get(fc.source_category_id) || [];
        existing.push(fc);
        map.set(fc.source_category_id, existing);
      }
    });
    return map;
  }, [formationContent]);

  // Categories with content
  const categoriesWithContent = useMemo(() => {
    return categories?.filter(cat => contentByCategory.has(cat.id)) || [];
  }, [categories, contentByCategory]);

  // Current category index
  const currentCategoryIndex = useMemo(() => {
    return categoriesWithContent.findIndex(cat => cat.id === (selectedCategoryId || categoriesWithContent[0]?.id));
  }, [categoriesWithContent, selectedCategoryId]);

  // Auto-select first category
  const effectiveCategoryId = selectedCategoryId || categoriesWithContent[0]?.id;
  const currentCategoryContent = effectiveCategoryId 
    ? contentByCategory.get(effectiveCategoryId) || []
    : [];

  // Calculate total sections across all modules for global progress
  const totalSections = useMemo(() => {
    return categoriesWithContent.reduce((sum, cat) => sum + (contentByCategory.get(cat.id)?.length || 0), 0);
  }, [categoriesWithContent, contentByCategory]);

  const globalSectionIndex = useMemo(() => {
    let count = 0;
    for (let i = 0; i < currentCategoryIndex; i++) {
      count += contentByCategory.get(categoriesWithContent[i]?.id)?.length || 0;
    }
    return count + currentSectionIndex;
  }, [currentCategoryIndex, currentSectionIndex, categoriesWithContent, contentByCategory]);

  // Presentation mode navigation - cross-module
  const currentSection = currentCategoryContent[currentSectionIndex];
  
  const hasNextSection = currentSectionIndex < currentCategoryContent.length - 1;
  const hasNextModule = currentCategoryIndex < categoriesWithContent.length - 1;
  const hasPrevSection = currentSectionIndex > 0;
  const hasPrevModule = currentCategoryIndex > 0;

  const hasNext = hasNextSection || hasNextModule;
  const hasPrev = hasPrevSection || hasPrevModule;

  const goNext = () => {
    if (hasNextSection) {
      setCurrentSectionIndex(i => i + 1);
    } else if (hasNextModule) {
      // Passer au module suivant
      const nextCat = categoriesWithContent[currentCategoryIndex + 1];
      setSelectedCategoryId(nextCat.id);
      setCurrentSectionIndex(0);
    }
  };

  const goPrev = () => {
    if (hasPrevSection) {
      setCurrentSectionIndex(i => i - 1);
    } else if (hasPrevModule) {
      // Revenir au module précédent (dernière section)
      const prevCat = categoriesWithContent[currentCategoryIndex - 1];
      const prevCatContent = contentByCategory.get(prevCat.id) || [];
      setSelectedCategoryId(prevCat.id);
      setCurrentSectionIndex(prevCatContent.length - 1);
    }
  };

  // Reset index when category changes manually
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    setCurrentSectionIndex(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Chargement du parcours formation...</div>
      </div>
    );
  }

  if (formationContent.length === 0) {
    return (
      <div className="container mx-auto py-12">
        <Card className="max-w-lg mx-auto text-center p-8">
          <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Parcours formation en préparation</h2>
          <p className="text-muted-foreground mb-4">Les contenus de formation sont en cours de génération par l'IA.</p>
          <Button variant="outline" asChild>
            <Link to="/admin/formation-generator">Accéder au générateur</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Module navigation */}
        <div className="w-64 border-r bg-muted/30 flex-shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-helpconfort-blue" />
              Parcours Formation
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {categoriesWithContent.length} modules • {formationContent.length} sections
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="p-2 space-y-1">
              {categoriesWithContent.map((cat, idx) => {
                const contentCount = contentByCategory.get(cat.id)?.length || 0;
                const isSelected = cat.id === effectiveCategoryId;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      isSelected 
                        ? "bg-helpconfort-blue text-white" 
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{cat.title}</span>
                      <Badge 
                        variant={isSelected ? "secondary" : "outline"} 
                        className={cn("ml-2", isSelected && "bg-white/20 text-white border-white/30")}
                      >
                        {contentCount}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header with presentation mode button */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {categories?.find(c => c.id === effectiveCategoryId)?.title}
                </h1>
                <p className="text-muted-foreground">
                  {currentCategoryContent.length} sections dans ce module
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  <ChevronsUpDown className="w-4 h-4 mr-1" />
                  Tout replier
                </Button>
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Tout déplier
                </Button>
                <Button onClick={() => setPresentationMode(true)}>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Mode présentation
                </Button>
              </div>
            </div>

            {/* Sections grid */}
            <div className="space-y-3">
              {currentCategoryContent.map((content, idx) => {
                const isEditing = editingId === content.id;
                const isCollapsed = collapsedSections.has(content.id);
                
                return (
                  <Collapsible 
                    key={content.id} 
                    open={!isCollapsed}
                    onOpenChange={() => toggleCollapse(content.id)}
                  >
                    <Card className="overflow-hidden">
                      <CardHeader className={cn(
                        "py-3 transition-colors",
                        isCollapsed ? "bg-muted/50" : "bg-muted/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 text-left flex-1 group">
                              <Grip className="w-4 h-4 text-muted-foreground" />
                              <span className="bg-helpconfort-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold group-hover:text-helpconfort-blue transition-colors truncate">
                                {content.source_block_title}
                              </span>
                              <ChevronRight className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
                                !isCollapsed && "rotate-90"
                              )} />
                            </button>
                          </CollapsibleTrigger>
                          {!isEditing && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleMoveSection("up", idx); }}
                                disabled={idx === 0 || reorderMutation.isPending}
                                title="Monter"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleMoveSection("down", idx); }}
                                disabled={idx === currentCategoryContent.length - 1 || reorderMutation.isPending}
                                title="Descendre"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleStartEdit(content); }}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Éditer
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(content); }}
                                className="text-destructive hover:text-destructive"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[300px] font-mono text-sm"
                                placeholder="Contenu en markdown..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Annuler
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleSaveEdit(content.id)}
                                  disabled={updateMutation.isPending}
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <FormationContentWithImages 
                                summary={content.generated_summary || ""} 
                                images={content.extracted_images || []}
                                onImageClick={setSelectedImageUrl}
                              />
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Image zoom dialog */}
      <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">Image agrandie</DialogTitle>
          {selectedImageUrl && (
            <img 
              src={selectedImageUrl} 
              alt="Image agrandie" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Presentation mode dialog */}
      <Dialog open={presentationMode} onOpenChange={closePresentationMode}>
        <DialogContent className={cn(
          "p-0 flex flex-col",
          isFullscreen 
            ? "!fixed !inset-0 !max-w-none !h-screen !w-screen !rounded-none !translate-x-0 !translate-y-0 !top-0 !left-0 z-[100]" 
            : "max-w-6xl h-[90vh]"
        )}>
          <DialogTitle className="sr-only">Mode présentation</DialogTitle>
          
          {currentSection && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">
                      Module {currentCategoryIndex + 1}/{categoriesWithContent.length}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm font-medium">
                      {categories?.find(c => c.id === effectiveCategoryId)?.title}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{currentSection.source_block_title}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Section {currentSectionIndex + 1}/{currentCategoryContent.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Global: {globalSectionIndex + 1}/{totalSections}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closePresentationMode}
                      title="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <div 
                  className="h-full bg-helpconfort-blue transition-all duration-300"
                  style={{ width: `${((globalSectionIndex + 1) / totalSections) * 100}%` }}
                />
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                <div className="prose prose-lg max-w-3xl mx-auto dark:prose-invert">
                  <FormationContentWithImages 
                    summary={currentSection.generated_summary || ""} 
                    images={currentSection.extracted_images || []}
                    onImageClick={setSelectedImageUrl}
                  />
                </div>
              </ScrollArea>

              {/* Navigation */}
              <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <Button
                  variant="outline"
                  onClick={goPrev}
                  disabled={!hasPrev}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {hasPrevSection ? "Précédent" : hasPrevModule ? "Module précédent" : "Précédent"}
                </Button>
                
                {/* Module indicator when transitioning */}
                {!hasNextSection && hasNextModule && (
                  <div className="flex items-center gap-2 text-sm text-helpconfort-blue">
                    <SkipForward className="w-4 h-4" />
                    <span>Module suivant: {categoriesWithContent[currentCategoryIndex + 1]?.title}</span>
                  </div>
                )}
                
                <Button
                  onClick={goNext}
                  disabled={!hasNext}
                  className={!hasNextSection && hasNextModule ? "bg-helpconfort-orange hover:bg-helpconfort-orange/90" : ""}
                >
                  {hasNextSection ? "Suivant" : hasNextModule ? "Module suivant" : "Terminer"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
            <AlertDialogDescription>
              La section "{itemToDelete?.source_block_title}" sera définitivement supprimée du parcours formation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
