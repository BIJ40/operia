import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
  RefreshCw,
  BookOpen,
  Image as ImageIcon,
  FileText,
  Zap
} from "lucide-react";
import { 
  useFormationContentList, 
  useGenerateFormationContent,
  useFormationStats,
  FormationContent
} from "@/hooks/useFormationContent";

interface Block {
  id: string;
  title: string;
  parent_id: string | null;
  type: string;
  order: number;
}

interface CategoryWithSections {
  id: string;
  title: string;
  sections: Block[];
}

export default function FormationGenerator() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [generatingBlocks, setGeneratingBlocks] = useState<Set<string>>(new Set());

  // Fetch all Apogée categories and sections
  const { data: blocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["blocks-apogee-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocks")
        .select("id, title, parent_id, type, order")
        .order("order", { ascending: true });

      if (error) throw error;
      return data as Block[];
    }
  });

  const { data: formationContent } = useFormationContentList();
  const { data: stats } = useFormationStats();
  const generateMutation = useGenerateFormationContent();

  // Build category → sections map
  const categories: CategoryWithSections[] = [];
  if (blocks) {
    const categoryBlocks = blocks.filter(b => b.type === "category");
    categoryBlocks.forEach(cat => {
      const sections = blocks
        .filter(b => b.type === "section" && b.parent_id === cat.id)
        .sort((a, b) => a.order - b.order);
      if (sections.length > 0) {
        categories.push({
          id: cat.id,
          title: cat.title,
          sections
        });
      }
    });
  }

  // Get formation content status for a block
  const getBlockStatus = (blockId: string): FormationContent | undefined => {
    return formationContent?.find(fc => fc.source_block_id === blockId);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const handleGenerate = async (blockId: string) => {
    setGeneratingBlocks(prev => new Set(prev).add(blockId));
    try {
      await generateMutation.mutateAsync(blockId);
    } finally {
      setGeneratingBlocks(prev => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    }
  };

  const handleGenerateAll = async (category: CategoryWithSections) => {
    for (const section of category.sections) {
      const status = getBlockStatus(section.id);
      if (!status || status.status !== "complete") {
        await handleGenerate(section.id);
      }
    }
  };

  const getStatusBadge = (status?: FormationContent) => {
    if (!status) {
      return <Badge variant="outline" className="text-muted-foreground">Non généré</Badge>;
    }
    switch (status.status) {
      case "complete":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Généré</Badge>;
      case "processing":
        return <Badge className="bg-helpconfort-blue/20 text-helpconfort-blue border-helpconfort-blue/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />En cours</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erreur</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  const getCategoryProgress = (category: CategoryWithSections) => {
    const complete = category.sections.filter(s => getBlockStatus(s.id)?.status === "complete").length;
    return { complete, total: category.sections.length };
  };

  // Keywords that identify Apogée SOFTWARE modules (the actual software features)
  const APOGEE_SOFTWARE_KEYWORDS = [
    "devis", "facture", "planning", "dossier", "intervention", "règlement", "reglement",
    "stock", "chiffrage", "sav", "fournisseur", "produit", "prestation",
    "chantier", "travaux", "sinistre", "relance", "tableau de bord", "statistique",
    "export", "import", "paramètre", "config", "utilisateur", "base article",
    "modèle", "template", "compte rendu", "cr ", "mail", "sms", "rappel",
    "signature", "bon de commande", "avoir", "acompte", "photo", "image", "navigation"
  ];

  // Keywords that identify HelpConfort FRANCHISE modules (business/franchise content)
  const HELPCONFORT_KEYWORDS = [
    "help confort", "helpconfort", "help! confort", "franchise", "entreprise",
    "local", "agence", "introduction", "principes", "généralités", "generalites",
    "présentation", "creation", "juridique", "social", "rh", "formation",
    "commercial", "marketing", "communication", "ouverture", "accompagnement",
    "réseau", "animateur", "redevance", "royalt"
  ];

  // Separate categories into Apogée SOFTWARE vs HelpConfort FRANCHISE
  const apogeeCategories = categories.filter(cat => {
    const titleLower = cat.title.toLowerCase();
    const isHelpConfort = HELPCONFORT_KEYWORDS.some(kw => titleLower.includes(kw));
    const isApogee = APOGEE_SOFTWARE_KEYWORDS.some(kw => titleLower.includes(kw));
    // If it matches Apogée keywords OR doesn't match HelpConfort keywords
    return isApogee || !isHelpConfort;
  });

  const helpconfortCategories = categories.filter(cat => {
    const titleLower = cat.title.toLowerCase();
    const isHelpConfort = HELPCONFORT_KEYWORDS.some(kw => titleLower.includes(kw));
    const isApogee = APOGEE_SOFTWARE_KEYWORDS.some(kw => titleLower.includes(kw));
    // HelpConfort if matches HelpConfort keywords AND doesn't match Apogée
    return isHelpConfort && !isApogee;
  });

  if (blocksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Stats tiles with blue gradient */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-helpconfort-blue/10">
                    <FileText className="w-5 h-5 text-helpconfort-blue" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total sections</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-500/5 via-background to-background">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
                    <div className="text-sm text-muted-foreground">Générés</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-helpconfort-blue/10">
                    <Zap className="w-5 h-5 text-helpconfort-blue" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-helpconfort-blue">{stats.processing}</div>
                    <div className="text-sm text-muted-foreground">En cours</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 via-background to-background">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                    <div className="text-sm text-muted-foreground">Erreurs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action button */}
        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <a href="/academy/apogee/formation" target="_blank">
              <BookOpen className="w-4 h-4 mr-2" />
              Voir le parcours formation
            </a>
          </Button>
        </div>

        {/* Categories list - APOGÉE (Logiciel) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-helpconfort-blue">🖥️ Modules Apogée (Logiciel)</CardTitle>
            <CardDescription>
              {apogeeCategories.length} catégories • {apogeeCategories.reduce((sum, c) => sum + c.sections.length, 0)} sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {apogeeCategories.map(category => {
                  const isExpanded = expandedCategories.has(category.id);
                  const progress = getCategoryProgress(category);
                  const allComplete = progress.complete === progress.total;

                  return (
                    <Collapsible key={category.id} open={isExpanded}>
                      <div className="border rounded-lg border-helpconfort-blue/20">
                        <CollapsibleTrigger asChild>
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-helpconfort-blue/5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-medium">{category.title}</span>
                              <Badge variant="secondary" className="ml-2">
                                {progress.complete}/{progress.total}
                              </Badge>
                              {allComplete && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={allComplete ? "outline" : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateAll(category);
                              }}
                              disabled={generatingBlocks.size > 0}
                            >
                              {allComplete ? (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Régénérer tout
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Générer tout
                                </>
                              )}
                            </Button>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t px-4 py-2 space-y-2 bg-muted/20">
                            {category.sections.map(section => {
                              const status = getBlockStatus(section.id);
                              const isGenerating = generatingBlocks.has(section.id);

                              return (
                                <div
                                  key={section.id}
                                  className="flex items-center justify-between py-2 px-3 rounded-md bg-background"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-sm truncate">{section.title}</span>
                                    {getStatusBadge(status)}
                                    {status?.extracted_images && status.extracted_images.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <ImageIcon className="w-3 h-3 mr-1" />
                                        {status.extracted_images.length}
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleGenerate(section.id)}
                                    disabled={isGenerating || generatingBlocks.size > 3}
                                  >
                                    {isGenerating ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : status?.status === "complete" ? (
                                      <RefreshCw className="w-4 h-4" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Categories list - HELPCONFORT (Franchise) */}
        {helpconfortCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-helpconfort-orange">🏠 Modules Help! Confort (Franchise)</CardTitle>
              <CardDescription>
                {helpconfortCategories.length} catégories • {helpconfortCategories.reduce((sum, c) => sum + c.sections.length, 0)} sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {helpconfortCategories.map(category => {
                    const isExpanded = expandedCategories.has(category.id);
                    const progress = getCategoryProgress(category);
                    const allComplete = progress.complete === progress.total;

                    return (
                      <Collapsible key={category.id} open={isExpanded}>
                        <div className="border rounded-lg border-helpconfort-orange/20">
                          <CollapsibleTrigger asChild>
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="w-full flex items-center justify-between p-4 hover:bg-helpconfort-orange/5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <span className="font-medium">{category.title}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {progress.complete}/{progress.total}
                                </Badge>
                                {allComplete && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant={allComplete ? "outline" : "default"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateAll(category);
                                }}
                                disabled={generatingBlocks.size > 0}
                              >
                                {allComplete ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Régénérer tout
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Générer tout
                                  </>
                                )}
                              </Button>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t px-4 py-2 space-y-2 bg-muted/20">
                              {category.sections.map(section => {
                                const status = getBlockStatus(section.id);
                                const isGenerating = generatingBlocks.has(section.id);

                                return (
                                  <div
                                    key={section.id}
                                    className="flex items-center justify-between py-2 px-3 rounded-md bg-background"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-sm truncate">{section.title}</span>
                                      {getStatusBadge(status)}
                                      {status?.extracted_images && status.extracted_images.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          <ImageIcon className="w-3 h-3 mr-1" />
                                          {status.extracted_images.length}
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleGenerate(section.id)}
                                      disabled={isGenerating || generatingBlocks.size > 3}
                                    >
                                      {isGenerating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : status?.status === "complete" ? (
                                        <RefreshCw className="w-4 h-4" />
                                      ) : (
                                        <Sparkles className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
