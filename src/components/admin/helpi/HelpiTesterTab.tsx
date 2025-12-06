/**
 * Helpi Tester Tab - Test de recherche RAG
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, FileText, BookOpen, HelpCircle, Database } from "lucide-react";

interface SearchResult {
  id: string;
  source_id: string | null;
  block_type: string;
  title: string | null;
  content: string;
  similarity: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalMatches: number;
}

const BLOCK_TYPE_ICONS: Record<string, React.ReactNode> = {
  apogee: <BookOpen className="h-3 w-3" />,
  helpconfort: <FileText className="h-3 w-3" />,
  document: <Database className="h-3 w-3" />,
  faq: <HelpCircle className="h-3 w-3" />,
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  apogee: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  helpconfort: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  document: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  faq: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function HelpiTesterTab() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("helpi-search", {
        body: {
          query: query.trim(),
          matchThreshold: 0.3,
          matchCount: 10,
        },
      });

      if (fnError) throw fnError;

      setResponse(data as SearchResponse);
    } catch (err) {
      console.error("[HELPI-TESTER] Error:", err);
      setError(String(err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tester la recherche Helpi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">Question ou recherche</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Comment créer un dossier ? / Quelle est la procédure de facturation ?"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="debug"
                checked={showDebug}
                onCheckedChange={setShowDebug}
              />
              <Label htmlFor="debug" className="text-sm">
                Afficher le JSON brut
              </Label>
            </div>

            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {response && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Résultats ({response.totalMatches} matchs)
              </CardTitle>
              <Badge variant="secondary">{response.results.length} affichés</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun résultat trouvé</p>
                <p className="text-sm">Essayez une autre formulation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {response.results.map((result, index) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={BLOCK_TYPE_COLORS[result.block_type] || ""}
                          >
                            <span className="mr-1">
                              {BLOCK_TYPE_ICONS[result.block_type]}
                            </span>
                            {result.block_type}
                          </Badge>
                          {result.title && (
                            <span className="text-sm font-medium truncate">
                              {result.title}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {result.content}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-primary">
                          {Math.round(result.similarity * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          similarité
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Debug JSON */}
            {showDebug && (
              <div className="mt-6">
                <Label className="text-sm text-muted-foreground">JSON brut</Label>
                <pre className="mt-2 p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
