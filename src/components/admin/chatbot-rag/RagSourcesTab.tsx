import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, FolderTree, Database } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SourceStats = {
  family: string;
  sourceType: string;
  blockCount: number;
  chunkCount: number;
  lastIndexed: string | null;
};

export function RagSourcesTab() {
  const [sources, setSources] = useState<SourceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexingFamily, setIndexingFamily] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSourceStats = async () => {
    setLoading(true);
    try {
      // Get blocks count by type
      // Apogée blocks (exclude helpconfort and apporteur)
      const { data: apogeeBlocks } = await supabase
        .from('blocks')
        .select('id', { count: 'exact' })
        .eq('type', 'section')
        .not('slug', 'like', 'helpconfort-%')
        .not('slug', 'like', 'apporteur-%');

      // HelpConfort blocks
      const { data: helpconfortBlocks } = await supabase
        .from('blocks')
        .select('id', { count: 'exact' })
        .eq('type', 'section')
        .like('slug', 'helpconfort-%');

      // Apporteurs blocks
      const { data: apporteurBlocks } = await supabase
        .from('apporteur_blocks')
        .select('id', { count: 'exact' })
        .eq('type', 'section');

      // Get chunks count by family
      const { data: chunks } = await supabase
        .from('guide_chunks')
        .select('block_type, metadata, created_at');

      // Aggregate stats
      const apogeeChunks = chunks?.filter(c => c.block_type === 'apogee_guide') || [];
      const helpconfortChunks = chunks?.filter(c => 
        c.block_type === 'helpconfort_guide' || 
        (c.metadata as any)?.family === 'helpconfort'
      ) || [];
      const apporteursChunks = chunks?.filter(c => 
        c.block_type === 'apporteurs_guide' || 
        (c.metadata as any)?.family === 'apporteurs'
      ) || [];
      const documentChunks = chunks?.filter(c => c.block_type === 'document') || [];

      const getLastIndexed = (chunkList: typeof chunks) => {
        if (!chunkList || chunkList.length === 0) return null;
        return chunkList.reduce((max, c) => c.created_at > max ? c.created_at : max, chunkList[0].created_at);
      };

      setSources([
        {
          family: 'Apogée',
          sourceType: 'blocks',
          blockCount: apogeeBlocks?.length || 0,
          chunkCount: apogeeChunks.length,
          lastIndexed: getLastIndexed(apogeeChunks),
        },
        {
          family: 'HelpConfort',
          sourceType: 'blocks',
          blockCount: helpconfortBlocks?.length || 0,
          chunkCount: helpconfortChunks.length,
          lastIndexed: getLastIndexed(helpconfortChunks),
        },
        {
          family: 'Apporteurs',
          sourceType: 'apporteur_blocks',
          blockCount: apporteurBlocks?.length || 0,
          chunkCount: apporteursChunks.length,
          lastIndexed: getLastIndexed(apporteursChunks),
        },
        {
          family: 'Documents',
          sourceType: 'documents',
          blockCount: 0,
          chunkCount: documentChunks.length,
          lastIndexed: getLastIndexed(documentChunks),
        },
      ]);
    } catch (error) {
      console.error('Error loading source stats:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques des sources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSourceStats();
  }, []);

  const handleIndexFamily = async (family: string) => {
    setIndexingFamily(family);
    try {
      if (family === 'Apogée') {
        const { data, error } = await supabase.functions.invoke('regenerate-apogee-rag');
        if (error) throw error;
        toast({
          title: 'Indexation terminée',
          description: `${data.sections_processed} sections traitées, ${data.chunks_created} chunks créés`,
        });
      } else if (family === 'HelpConfort') {
        const { data, error } = await supabase.functions.invoke('regenerate-helpconfort-rag');
        if (error) throw error;
        toast({
          title: 'Indexation terminée',
          description: `${data.sections_processed} sections traitées, ${data.chunks_created} chunks créés`,
        });
      } else {
        toast({
          title: 'Non implémenté',
          description: `L'indexation pour ${family} n'est pas encore disponible`,
          variant: 'destructive',
        });
      }
      await loadSourceStats();
    } catch (error) {
      console.error('Indexing error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'indexation',
        variant: 'destructive',
      });
    } finally {
      setIndexingFamily(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          Sources RAG Internes
        </CardTitle>
        <CardDescription>
          Visualisez et indexez les sources de données pour le chatbot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={loadSourceStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Famille</TableHead>
              <TableHead>Type Source</TableHead>
              <TableHead className="text-right"># Blocs</TableHead>
              <TableHead className="text-right"># Chunks</TableHead>
              <TableHead>Dernière indexation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.family}>
                  <TableCell>
                    <Badge variant="outline">{source.family}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {source.sourceType}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {source.blockCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={source.chunkCount > 0 ? 'default' : 'secondary'}>
                      {source.chunkCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {source.lastIndexed 
                      ? format(new Date(source.lastIndexed), 'dd/MM/yyyy HH:mm', { locale: fr })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleIndexFamily(source.family)}
                      disabled={indexingFamily === source.family}
                    >
                      {indexingFamily === source.family ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      <span className="ml-2">Indexer</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
