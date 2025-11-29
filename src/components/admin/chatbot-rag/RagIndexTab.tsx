import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, RefreshCw, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type IndexStats = {
  family: string;
  sourceType: string;
  chunkCount: number;
  exampleTitles: string[];
  lastUpdated: string | null;
};

export function RagIndexTab() {
  const [stats, setStats] = useState<IndexStats[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState<string | null>(null);
  const { toast } = useToast();

  const loadIndexStats = async () => {
    setLoading(true);
    try {
      const { data: chunks, error } = await supabase
        .from('guide_chunks')
        .select('block_type, block_title, metadata, created_at');

      if (error) throw error;

      // Aggregate by family and source_type
      const statsMap = new Map<string, IndexStats>();

      (chunks || []).forEach(chunk => {
        const metadata = chunk.metadata as any;
        const family = metadata?.source || metadata?.family || 'autre';
        const sourceType = chunk.block_type || 'unknown';
        const key = `${family}-${sourceType}`;

        if (!statsMap.has(key)) {
          statsMap.set(key, {
            family,
            sourceType,
            chunkCount: 0,
            exampleTitles: [],
            lastUpdated: null,
          });
        }

        const stat = statsMap.get(key)!;
        stat.chunkCount++;
        
        if (stat.exampleTitles.length < 3 && chunk.block_title) {
          if (!stat.exampleTitles.includes(chunk.block_title)) {
            stat.exampleTitles.push(chunk.block_title);
          }
        }

        if (!stat.lastUpdated || chunk.created_at > stat.lastUpdated) {
          stat.lastUpdated = chunk.created_at;
        }
      });

      setStats(Array.from(statsMap.values()).sort((a, b) => b.chunkCount - a.chunkCount));
      setTotalChunks(chunks?.length || 0);
    } catch (error) {
      console.error('Error loading index stats:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques de l\'index',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIndexStats();
  }, []);

  const handleRebuild = async (target: 'apogee' | 'documents' | 'all') => {
    setRebuilding(target);
    try {
      if (target === 'apogee' || target === 'all') {
        const { error } = await supabase.functions.invoke('regenerate-apogee-rag');
        if (error) throw error;
      }

      if (target === 'documents' || target === 'all') {
        // Rebuild all document chunks
        const { data: docs } = await supabase
          .from('documents')
          .select('id, file_path');

        for (const doc of docs || []) {
          try {
            await supabase.functions.invoke('index-document', {
              body: { documentId: doc.id, filePath: doc.file_path },
            });
          } catch (e) {
            console.error(`Error indexing doc ${doc.id}:`, e);
          }
        }
      }

      toast({
        title: 'Reconstruction terminée',
        description: `Index ${target === 'all' ? 'complet' : target} reconstruit`,
      });

      await loadIndexStats();
    } catch (error) {
      console.error('Rebuild error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de la reconstruction',
        variant: 'destructive',
      });
    } finally {
      setRebuilding(null);
    }
  };

  const handleClearIndex = async () => {
    if (!confirm('Supprimer TOUT l\'index RAG ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('guide_chunks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: 'Index vidé',
        description: 'Tous les chunks ont été supprimés',
      });

      await loadIndexStats();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vider l\'index',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Index RAG (guide_chunks)
          </CardTitle>
          <CardDescription>
            Vue synthétique de l'index vectoriel utilisé par le chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-helpconfort-blue">{totalChunks}</p>
                <p className="text-sm text-muted-foreground">Chunks totaux</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.length}</p>
                <p className="text-sm text-muted-foreground">Familles</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadIndexStats} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </div>

          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              L'index RAG est la table <code>guide_chunks</code>. Chaque chunk contient un embedding vectoriel
              utilisé pour la recherche sémantique du chatbot.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              onClick={() => handleRebuild('apogee')}
              disabled={!!rebuilding}
              variant="outline"
            >
              {rebuilding === 'apogee' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Rebâtir Apogée
            </Button>
            <Button
              onClick={() => handleRebuild('documents')}
              disabled={!!rebuilding}
              variant="outline"
            >
              {rebuilding === 'documents' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Rebâtir Documents
            </Button>
            <Button
              onClick={() => handleRebuild('all')}
              disabled={!!rebuilding}
            >
              {rebuilding === 'all' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
              Rebâtir tout l'index
            </Button>
            <Button
              onClick={handleClearIndex}
              disabled={!!rebuilding}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vider l'index
            </Button>
          </div>

          {/* Stats Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Famille</TableHead>
                <TableHead>Type Source</TableHead>
                <TableHead className="text-right"># Chunks</TableHead>
                <TableHead>Exemples</TableHead>
                <TableHead>Dernière MAJ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Index vide
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Badge variant="outline">{stat.family}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stat.sourceType}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{stat.chunkCount}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {stat.exampleTitles.join(', ')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stat.lastUpdated
                        ? format(new Date(stat.lastUpdated), 'dd/MM/yyyy HH:mm', { locale: fr })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
