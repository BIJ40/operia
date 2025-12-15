import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
import { PageHeader } from '@/components/layout/PageHeader';

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

  const handleGenerate = (blockId: string) => {
    if (generatingBlocks.has(blockId)) return;
    
    setGeneratingBlocks(prev => new Set(prev).add(blockId));
    
    generateMutation.mutateAsync(blockId)
      .finally(() => {
        setGeneratingBlocks(prev => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      });
  };

  const handleGenerateAll = (category: CategoryWithSections, forceRegenerate = false) => {
    // Lance toutes les générations en parallèle
    category.sections.forEach(section => {
      const status = getBlockStatus(section.id);
      // Si forceRegenerate, on régénère tout. Sinon, seulement les non-complets
      if (forceRegenerate || !status || status.status !== "complete") {
        handleGenerate(section.id);
      }
    });
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

  // Apogée SOFTWARE categories have IDs starting with "cat-" or specific block IDs
  const APOGEE_IDS = new Set([
    "cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6", "cat-7", "cat-8", "cat-9", "cat-12",
    "block-1763071521876-c8sdc0odr", // 2 - Généralités
    "block-1763324145731-nbn6tean2", // 6 - Le Planning
    "block-1763482223891-n1zg4hncz", // 8 - Gestion des articles
    "block-1764001677016-1gwdu5pcd", // 10 - Commandes
    "block-1763071678015-p41ao70z8", // 15 - Les Paramètres
    "block-1763802287662-om2hpd60s", // 16 - Gestion des listes
  ]);

  // Separate categories: Apogée (logiciel) vs HelpConfort (franchise)
  const apogeeCategories = categories
    .filter(cat => APOGEE_IDS.has(cat.id))
    .sort((a, b) => {
      // Extract number from title like "3 - Clients" -> 3
      const numA = parseInt(a.title.match(/^(\d+)/)?.[1] || "99");
      const numB = parseInt(b.title.match(/^(\d+)/)?.[1] || "99");
      return numA - numB;
    });

  const helpconfortCategories = categories
    .filter(cat => !APOGEE_IDS.has(cat.id))
    .sort((a, b) => {
      const numA = parseInt(a.title.match(/^(\d+)/)?.[1] || "99");
      const numB = parseInt(b.title.match(/^(\d+)/)?.[1] || "99");
      return numA - numB;
    });

  if (blocksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        title="Générateur de Formation"
        subtitle="Génération automatique des contenus pédagogiques"
        backTo="/admin"
        backLabel="Administration"
      />

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
            <Link to="/academy/formation" target="_blank" rel="noreferrer">
              <BookOpen className="w-4 h-4 mr-2" />
              Voir le parcours formation
            </Link>
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
                  const isCategoryGenerating = category.sections.some(s => generatingBlocks.has(s.id));

                  return (
                    <Collapsible key={category.id} open={isExpanded}>
                      <div className="border rounded-lg border-helpconfort-blue/20">
                        <div className="flex items-center justify-between p-4 hover:bg-helpconfort-blue/5 transition-colors">
                          <CollapsibleTrigger asChild>
                            <button
                              onClick={() => toggleCategory(category.id)}
                              className="flex items-center gap-3 flex-1"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-medium">{category.title}</span>
                              <Badge variant="secondary" className="ml-2">
                                {progress.complete}/{progress.total}
                              </Badge>
                              {allComplete && !isCategoryGenerating && (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                              {isCategoryGenerating && (
                                <Loader2 className="w-4 h-4 animate-spin text-helpconfort-blue" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <Button
                            size="sm"
                            variant={allComplete ? "outline" : "default"}
                            onClick={() => handleGenerateAll(category, allComplete)}
                            disabled={isCategoryGenerating}
                          >
                            {isCategoryGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Génération...
                              </>
                            ) : allComplete ? (
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
                        </div>
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
                                    disabled={isGenerating}
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
                    const isCategoryGenerating = category.sections.some(s => generatingBlocks.has(s.id));

                    return (
                      <Collapsible key={category.id} open={isExpanded}>
                        <div className="border rounded-lg border-helpconfort-orange/20">
                          <div className="flex items-center justify-between p-4 hover:bg-helpconfort-orange/5 transition-colors">
                            <CollapsibleTrigger asChild>
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="flex items-center gap-3 flex-1"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <span className="font-medium">{category.title}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {progress.complete}/{progress.total}
                                </Badge>
                                {allComplete && !isCategoryGenerating && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                                {isCategoryGenerating && (
                                  <Loader2 className="w-4 h-4 animate-spin text-helpconfort-orange" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <Button
                              size="sm"
                              variant={allComplete ? "outline" : "default"}
                              onClick={() => handleGenerateAll(category, allComplete)}
                              disabled={isCategoryGenerating}
                            >
                              {isCategoryGenerating ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Génération...
                                </>
                              ) : allComplete ? (
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
                          </div>
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
                                      disabled={isGenerating}
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
