/**
 * Helpi Indexer Tab - Réindexation des sources
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { 
  BookOpen, 
  FileText, 
  Database, 
  HelpCircle, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw 
} from "lucide-react";
import { successToast, errorToast } from "@/lib/toastHelpers";

type SourceType = "apogee" | "helpconfort" | "document" | "faq";

interface IndexResult {
  success: boolean;
  source: string;
  itemsProcessed: number;
  chunksCreated: number;
  error?: string;
}

const SOURCES: Array<{
  id: SourceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: "apogee",
    label: "Guides Apogée",
    description: "Documentation métier et procédures Apogée",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "helpconfort",
    label: "Guides HelpConfort",
    description: "Documentation HelpConfort et bonnes pratiques",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "document",
    label: "Documents",
    description: "Documents uploadés et ressources",
    icon: <Database className="h-5 w-5" />,
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Questions fréquentes et réponses",
    icon: <HelpCircle className="h-5 w-5" />,
  },
];

export function HelpiIndexerTab() {
  const [indexingSource, setIndexingSource] = useState<SourceType | null>(null);
  const [results, setResults] = useState<Record<SourceType, IndexResult | null>>({
    apogee: null,
    helpconfort: null,
    document: null,
    faq: null,
  });
  const queryClient = useQueryClient();

  const handleIndex = async (source: SourceType) => {
    setIndexingSource(source);
    setResults((prev) => ({ ...prev, [source]: null }));

    try {
      const { data, error } = await supabase.functions.invoke("helpi-index", {
        body: { source, mode: "full" },
      });

      if (error) throw error;

      const result: IndexResult = {
        success: true,
        source,
        itemsProcessed: data.itemsProcessed || 0,
        chunksCreated: data.chunksCreated || 0,
      };

      setResults((prev) => ({ ...prev, [source]: result }));
      successToast(
        `Indexation terminée: ${result.chunksCreated} chunks créés depuis ${result.itemsProcessed} sources`
      );

      // Refresh stats
      queryClient.invalidateQueries({ queryKey: ["helpi-stats"] });
    } catch (error) {
      console.error("[HELPI-INDEXER] Error:", error);
      const result: IndexResult = {
        success: false,
        source,
        itemsProcessed: 0,
        chunksCreated: 0,
        error: String(error),
      };
      setResults((prev) => ({ ...prev, [source]: result }));
      errorToast(`Erreur d'indexation: ${String(error)}`);
    } finally {
      setIndexingSource(null);
    }
  };

  const handleIndexAll = async () => {
    for (const source of SOURCES) {
      await handleIndex(source.id);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          L'indexation génère des embeddings pour chaque contenu, permettant la recherche sémantique.
          Une réindexation complète supprime les chunks existants avant de les recréer.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button
          onClick={handleIndexAll}
          disabled={indexingSource !== null}
          variant="default"
        >
          {indexingSource ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Tout réindexer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((source) => {
          const result = results[source.id];
          const isIndexing = indexingSource === source.id;

          return (
            <Card key={source.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {source.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{source.label}</CardTitle>
                    <CardDescription className="text-xs">
                      {source.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result && (
                  <div 
                    className={`p-3 rounded-lg text-sm ${
                      result.success 
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        {result.success ? "Succès" : "Erreur"}
                      </span>
                    </div>
                    {result.success ? (
                      <p className="mt-1 text-xs">
                        {result.itemsProcessed} sources → {result.chunksCreated} chunks
                      </p>
                    ) : (
                      <p className="mt-1 text-xs">{result.error}</p>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => handleIndex(source.id)}
                  disabled={indexingSource !== null}
                  variant="outline"
                  className="w-full"
                >
                  {isIndexing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Indexation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Réindexer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
