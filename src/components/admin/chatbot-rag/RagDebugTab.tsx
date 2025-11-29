import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bug, Search, FileText } from 'lucide-react';

type ChunkResult = {
  id: string;
  block_title: string;
  block_type: string;
  chunk_text: string;
  similarity: number;
  metadata: any;
};

export function RagDebugTab() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string>('apogee');
  const [module, setModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une question',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setPrompt('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            query,
            topK: 8,
            source: family === 'all' ? null : family,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);

      // Build the prompt that would be sent to the AI
      if (data.results && data.results.length > 0) {
        const docsContent = data.results
          .map((r: ChunkResult, idx: number) => {
            const metadata = r.metadata as any;
            const prefix = metadata?.categorie 
              ? `[Catégorie: ${metadata.categorie}]\n`
              : '';
            return `[doc ${idx + 1}] ${r.block_title}\n${prefix}${r.chunk_text}`;
          })
          .join('\n\n---\n\n');

        const systemPrompt = `Tu es l'assistant Apogée Help Confort, expert du logiciel de gestion Apogée.

📚 DOCUMENTATION APOGÉE (extraits pertinents) :
<docs>
${docsContent}
</docs>

📋 RÈGLES :

1. Tu DOIS répondre en utilisant les informations présentes dans <docs>.
2. Tu peux synthétiser, reformuler et expliquer les concepts des <docs> de manière pédagogique.
3. Tu cites la source [Catégorie | Section] quand c'est pertinent.
4. Tu donnes des réponses claires, structurées et utiles.
5. Si l'utilisateur demande plus de détails sur un sujet présent dans <docs>, tu approfondis.

⚠️ UNIQUEMENT si aucune information pertinente n'existe dans <docs>, tu réponds :
"Cette information n'est pas présente dans les guides Apogée actuellement indexés."

Réponds en français. Sois concis mais complet.`;

        setPrompt(systemPrompt);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la recherche',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug RAG
          </CardTitle>
          <CardDescription>
            Testez la recherche RAG et visualisez le contexte envoyé à l'IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Question de test</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Comment créer un avoir ?"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Famille</Label>
                <Select value={family} onValueChange={setFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="apogee">Apogée</SelectItem>
                    <SelectItem value="apporteurs">Apporteurs</SelectItem>
                    <SelectItem value="helpconfort">HelpConfort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Module (optionnel)</Label>
                <Input
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  placeholder="Ex: Facturation, RT..."
                />
              </div>
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Rechercher
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Chunks trouvés ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {results.map((result, idx) => (
                <Card key={result.id} className="p-3 border-l-4 border-l-helpconfort-blue">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span className="font-medium text-sm">{result.block_title}</span>
                    </div>
                    <Badge variant="secondary">
                      Score: {(result.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {(result.metadata as any)?.source || result.block_type}
                    </Badge>
                    {(result.metadata as any)?.categorie && (
                      <Badge variant="outline" className="text-xs">
                        {(result.metadata as any).categorie}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {result.chunk_text}
                  </p>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Prompt */}
      {prompt && (
        <Card>
          <CardHeader>
            <CardTitle>Prompt système généré</CardTitle>
            <CardDescription>
              Ce prompt serait envoyé à l'IA avec la question de l'utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              readOnly
              rows={20}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>
      )}

      {!loading && results.length === 0 && query && (
        <Card className="p-4">
          <p className="text-center text-muted-foreground">
            Aucun résultat trouvé. Vérifiez que l'index est bien rempli.
          </p>
        </Card>
      )}
    </div>
  );
}
