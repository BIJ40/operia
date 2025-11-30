import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, FolderTree, Database } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { safeQuery, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast, warningToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

type SourceStats = {
  family: string;
  sourceType: string;
  blockCount: number;
  chunkCount: number;
  lastIndexed: string | null;
};

type RegenerateRagResponse = {
  sections_processed: number;
  chunks_created: number;
};

export function RagSourcesTab() {
  const [sources, setSources] = useState<SourceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexingFamily, setIndexingFamily] = useState<string | null>(null);

  const loadSourceStats = async () => {
    setLoading(true);
    try {
      // Get blocks count by type
      // Apogée blocks (exclude helpconfort and apporteur)
      const apogeeResult = await safeQuery<{ id: string }[]>(
        supabase
          .from('blocks')
          .select('id', { count: 'exact' })
          .eq('type', 'section')
          .not('slug', 'like', 'helpconfort-%')
          .not('slug', 'like', 'apporteur-%'),
        'RAG_SOURCES_LOAD_APOGEE_BLOCKS'
      );

      if (!apogeeResult.success) {
        logError('rag-sources', 'Error loading Apogée blocks', apogeeResult.error);
      }
      const apogeeBlocks = apogeeResult.data || [];

      // HelpConfort blocks
      const helpconfortResult = await safeQuery<{ id: string }[]>(
        supabase
          .from('blocks')
          .select('id', { count: 'exact' })
          .eq('type', 'section')
          .like('slug', 'helpconfort-%'),
        'RAG_SOURCES_LOAD_HELPCONFORT_BLOCKS'
      );

      if (!helpconfortResult.success) {
        logError('rag-sources', 'Error loading HelpConfort blocks', helpconfortResult.error);
      }
      const helpconfortBlocks = helpconfortResult.data || [];

      // Apporteurs blocks
      const apporteurResult = await safeQuery<{ id: string }[]>(
        supabase
          .from('apporteur_blocks')
          .select('id', { count: 'exact' })
          .eq('type', 'section'),
        'RAG_SOURCES_LOAD_APPORTEUR_BLOCKS'
      );

      if (!apporteurResult.success) {
        logError('rag-sources', 'Error loading Apporteur blocks', apporteurResult.error);
      }
      const apporteurBlocks = apporteurResult.data || [];

      // Get chunks count by family
      const chunksResult = await safeQuery<{ block_type: string; metadata: unknown; created_at: string }[]>(
        supabase
          .from('guide_chunks')
          .select('block_type, metadata, created_at'),
        'RAG_SOURCES_LOAD_CHUNKS'
      );

      if (!chunksResult.success) {
        logError('rag-sources', 'Error loading guide chunks', chunksResult.error);
      }
      const chunks = chunksResult.data || [];

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
      logError('rag-sources', 'Error loading source stats', error);
      errorToast('Impossible de charger les statistiques des sources');
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSourceStats();
  }, []);

  const handleIndexFamily = async (family: string) => {
    setIndexingFamily(family);

    if (family === 'Apogée') {
      const result = await safeInvoke<RegenerateRagResponse>(
        supabase.functions.invoke('regenerate-apogee-rag'),
        'RAG_SOURCES_INDEX_APOGEE'
      );

      if (!result.success) {
        logError('rag-sources', 'Error indexing Apogée', result.error);
        errorToast(result.error ?? 'Erreur lors de l\'indexation Apogée');
        setIndexingFamily(null);
        return;
      }

      successToast(
        'Indexation terminée',
        `${result.data?.sections_processed} sections traitées, ${result.data?.chunks_created} chunks créés`
      );
    } else if (family === 'HelpConfort') {
      const result = await safeInvoke<RegenerateRagResponse>(
        supabase.functions.invoke('regenerate-helpconfort-rag'),
        'RAG_SOURCES_INDEX_HELPCONFORT'
      );

      if (!result.success) {
        logError('rag-sources', 'Error indexing HelpConfort', result.error);
        errorToast(result.error ?? 'Erreur lors de l\'indexation HelpConfort');
        setIndexingFamily(null);
        return;
      }

      successToast(
        'Indexation terminée',
        `${result.data?.sections_processed} sections traitées, ${result.data?.chunks_created} chunks créés`
      );
    } else {
      warningToast(`L'indexation pour ${family} n'est pas encore disponible`);
      setIndexingFamily(null);
      return;
    }

    await loadSourceStats();
    setIndexingFamily(null);
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
