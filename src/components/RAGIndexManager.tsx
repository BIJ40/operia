import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

interface HelpiIndexResponse {
  itemsProcessed: number;
  chunksCreated: number;
}

export function RAGIndexManager() {
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStats, setIndexStats] = useState<{
    itemsProcessed?: number;
    chunksCreated?: number;
  } | null>(null);

  const handleIndex = async () => {
    setIsIndexing(true);
    setIndexStats(null);

    // Index all sources sequentially
    const sources = ['apogee', 'helpconfort', 'document', 'faq'] as const;
    let totalItems = 0;
    let totalChunks = 0;

    for (const source of sources) {
      const result = await safeInvoke<HelpiIndexResponse>(
        supabase.functions.invoke('helpi-index', {
          body: { source, mode: 'full' },
        }),
        'RAG_INDEX_GENERATE'
      );

      if (!result.success) {
        logError('rag-index-manager', `Error indexing ${source}`, result.error);
        // Continue with other sources
        continue;
      }

      if (result.data) {
        totalItems += result.data.itemsProcessed || 0;
        totalChunks += result.data.chunksCreated || 0;
      }
    }

    setIndexStats({ itemsProcessed: totalItems, chunksCreated: totalChunks });
    successToast(
      'Indexation terminée',
      `${totalItems} sources traitées, ${totalChunks} chunks créés`
    );

    setIsIndexing(false);
  };

  const handleCheckIndex = async () => {
    try {
      const { count, error } = await supabase
        .from('guide_chunks')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      successToast(
        'Index vérifié',
        `${count || 0} chunks indexés dans la base`
      );
    } catch (error) {
      logError('rag-index-manager', 'Error checking index status', error);
      errorToast('Impossible de vérifier l\'index');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Gestion de l'Index RAG
        </CardTitle>
        <CardDescription>
          Indexez le contenu du guide pour activer la recherche sémantique avancée du chatbot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Le système RAG découpe le contenu en chunks intelligents et génère des embeddings pour une recherche 
            sémantique précise. Cela permet au chatbot de gérer des guides illimités et de répondre plus précisément.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={handleIndex} 
            disabled={isIndexing}
            className="flex-1"
          >
            {isIndexing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Indexation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réindexer le Guide
              </>
            )}
          </Button>

          <Button 
            onClick={handleCheckIndex} 
            variant="outline"
          >
            <Database className="mr-2 h-4 w-4" />
            Vérifier l'Index
          </Button>
        </div>

        {indexStats && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Dernière indexation:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Sources traitées:</span>
                <span className="ml-2 font-medium">{indexStats.itemsProcessed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Chunks créés:</span>
                <span className="ml-2 font-medium">{indexStats.chunksCreated}</span>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> L'indexation peut prendre quelques minutes pour les grands guides.</p>
          <p>Réindexez après avoir modifié le contenu pour mettre à jour le chatbot.</p>
        </div>
      </CardContent>
    </Card>
  );
}
