import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2,
  Image as ImageIcon,
  ExternalLink,
  GraduationCap
} from "lucide-react";
import { useFormationContentList, FormationContent } from "@/hooks/useFormationContent";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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

  // Auto-select first category
  const effectiveCategoryId = selectedCategoryId || categoriesWithContent[0]?.id;
  const currentCategoryContent = effectiveCategoryId 
    ? contentByCategory.get(effectiveCategoryId) || []
    : [];

  // Presentation mode navigation
  const currentSection = currentCategoryContent[currentSectionIndex];
  const hasNext = currentSectionIndex < currentCategoryContent.length - 1;
  const hasPrev = currentSectionIndex > 0;

  const goNext = () => {
    if (hasNext) setCurrentSectionIndex(i => i + 1);
  };

  const goPrev = () => {
    if (hasPrev) setCurrentSectionIndex(i => i - 1);
  };

  // Reset index when category changes
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
          <p className="text-muted-foreground mb-4">
            Les contenus de formation sont en cours de génération par l'IA.
          </p>
          <Button variant="outline" asChild>
            <a href="/admin/formation-generator">
              Accéder au générateur
            </a>
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
              <Button onClick={() => setPresentationMode(true)}>
                <Maximize2 className="w-4 h-4 mr-2" />
                Mode présentation
              </Button>
            </div>

            {/* Sections grid */}
            <div className="space-y-6">
              {currentCategoryContent.map((content, idx) => (
                <Card key={content.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="bg-helpconfort-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        {content.source_block_title}
                      </CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`/academy/apogee/category/${content.source_category_id}#${content.source_block_id}`}
                          target="_blank"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Voir détail
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Images gallery */}
                    {content.extracted_images && content.extracted_images.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                          <ImageIcon className="w-4 h-4" />
                          {content.extracted_images.length} image(s)
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {content.extracted_images.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              onClick={() => setSelectedImageUrl(img)}
                              className="flex-shrink-0 border rounded-md overflow-hidden hover:ring-2 ring-helpconfort-blue transition-all"
                            >
                              <img 
                                src={img} 
                                alt={`Image ${imgIdx + 1}`}
                                className="h-20 w-auto object-contain bg-muted"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{content.generated_summary || ""}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
      <Dialog open={presentationMode} onOpenChange={setPresentationMode}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col">
          <DialogTitle className="sr-only">Mode présentation</DialogTitle>
          
          {currentSection && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
                <div>
                  <Badge variant="outline" className="mb-1">
                    {categories?.find(c => c.id === effectiveCategoryId)?.title}
                  </Badge>
                  <h2 className="text-xl font-bold">{currentSection.source_block_title}</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentSectionIndex + 1} / {currentCategoryContent.length}
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-6">
                {/* Images */}
                {currentSection.extracted_images && currentSection.extracted_images.length > 0 && (
                  <div className="mb-6">
                    <div className="flex gap-4 justify-center flex-wrap">
                      {currentSection.extracted_images.slice(0, 3).map((img, imgIdx) => (
                        <img 
                          key={imgIdx}
                          src={img} 
                          alt={`Image ${imgIdx + 1}`}
                          className="max-h-48 w-auto object-contain rounded-lg border shadow-sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="prose prose-lg max-w-3xl mx-auto dark:prose-invert">
                  <ReactMarkdown>{currentSection.generated_summary || ""}</ReactMarkdown>
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
                  Précédent
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!hasNext}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
