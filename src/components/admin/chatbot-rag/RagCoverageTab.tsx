import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import { safeQuery } from '@/lib/safeQuery';
import { errorToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

type CoverageStats = {
  family: string;
  totalBlocks: number;
  indexedBlocks: number;
  coverage: number;
  lastUpdate: string | null;
};

type ChunkRow = {
  block_id: string;
  block_type: string;
  created_at: string | null;
};

export function RagCoverageTab() {
  const [stats, setStats] = useState<CoverageStats[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCoverageStats = async () => {
    setLoading(true);
    try {
      // Get all blocks by family
      const [apogeeRes, helpconfortRes, apporteursRes] = await Promise.all([
        safeQuery<{ id: string }[]>(
          supabase
            .from('blocks')
            .select('id')
            .eq('type', 'section')
            .not('slug', 'like', 'helpconfort-%')
            .not('slug', 'like', 'apporteur-%'),
          'RAG_COVERAGE_APOGEE_BLOCKS'
        ),
        safeQuery<{ id: string }[]>(
          supabase
            .from('blocks')
            .select('id')
            .eq('type', 'section')
            .like('slug', 'helpconfort-%'),
          'RAG_COVERAGE_HELPCONFORT_BLOCKS'
        ),
        safeQuery<{ id: string }[]>(
          supabase
            .from('apporteur_blocks')
            .select('id')
            .eq('type', 'section'),
          'RAG_COVERAGE_APPORTEURS_BLOCKS'
        ),
      ]);

      // Get indexed chunks
      const chunksRes = await safeQuery<ChunkRow[]>(
        supabase.from('guide_chunks').select('block_id, block_type, created_at'),
        'RAG_COVERAGE_CHUNKS'
      );

      if (!chunksRes.success) {
        throw new Error(chunksRes.error?.message || 'Failed to load chunks');
      }

      const chunks = chunksRes.data || [];
      
      // Calculate coverage per family
      const apogeeBlocks = apogeeRes.data || [];
      const apogeeChunks = chunks.filter(c => c.block_type === 'apogee_guide');
      const apogeeIndexedIds = new Set(apogeeChunks.map(c => c.block_id));
      
      const helpconfortBlocks = helpconfortRes.data || [];
      const helpconfortChunks = chunks.filter(c => c.block_type === 'helpconfort_guide');
      const helpconfortIndexedIds = new Set(helpconfortChunks.map(c => c.block_id));
      
      const apporteursBlocks = apporteursRes.data || [];
      const apporteursChunks = chunks.filter(c => c.block_type === 'apporteurs_guide');
      const apporteursIndexedIds = new Set(apporteursChunks.map(c => c.block_id));

      const getLastUpdate = (chunkList: ChunkRow[]) => {
        if (chunkList.length === 0) return null;
        return chunkList.reduce((max, c) => (c.created_at && c.created_at > (max || '')) ? c.created_at : max, null as string | null);
      };

      setStats([
        {
          family: 'Apogée',
          totalBlocks: apogeeBlocks.length,
          indexedBlocks: apogeeIndexedIds.size,
          coverage: apogeeBlocks.length > 0 ? (apogeeIndexedIds.size / apogeeBlocks.length) * 100 : 0,
          lastUpdate: getLastUpdate(apogeeChunks),
        },
        {
          family: 'HelpConfort',
          totalBlocks: helpconfortBlocks.length,
          indexedBlocks: helpconfortIndexedIds.size,
          coverage: helpconfortBlocks.length > 0 ? (helpconfortIndexedIds.size / helpconfortBlocks.length) * 100 : 0,
          lastUpdate: getLastUpdate(helpconfortChunks),
        },
        {
          family: 'Apporteurs',
          totalBlocks: apporteursBlocks.length,
          indexedBlocks: apporteursIndexedIds.size,
          coverage: apporteursBlocks.length > 0 ? (apporteursIndexedIds.size / apporteursBlocks.length) * 100 : 0,
          lastUpdate: getLastUpdate(apporteursChunks),
        },
      ]);
    } catch (error) {
      logError('rag-coverage', 'Error loading coverage stats', error);
      errorToast('Impossible de charger les statistiques de couverture');
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverageStats();
  }, []);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'text-green-600';
    if (coverage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageIcon = (coverage: number) => {
    if (coverage >= 80) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Couverture RAG
        </CardTitle>
        <CardDescription>
          Taux d'indexation des contenus par famille
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={loadCoverageStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {stats.map((stat) => (
              <div key={stat.family} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{stat.family}</Badge>
                    {getCoverageIcon(stat.coverage)}
                  </div>
                  <span className={`font-medium ${getCoverageColor(stat.coverage)}`}>
                    {stat.coverage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stat.coverage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stat.indexedBlocks} / {stat.totalBlocks} blocs indexés</span>
                  {stat.lastUpdate && (
                    <span>MAJ: {new Date(stat.lastUpdate).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
            ))}

            {stats.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Couverture globale</span>
                  <span className="font-bold text-lg">
                    {(stats.reduce((sum, s) => sum + s.coverage, 0) / stats.length).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
