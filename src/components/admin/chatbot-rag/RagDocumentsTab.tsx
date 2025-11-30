/**
 * RagDocumentsTab - Bibliothèque / Catalogue RAG
 * Consultation et gestion des documents déjà indexés
 * AUCUN UPLOAD - utiliser l'onglet Ingestion pour ajouter des documents
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast, warningToast } from '@/lib/toastHelpers';
import { logError, logInfo } from '@/lib/logger';
import { 
  Loader2, 
  FileText, 
  Trash2, 
  Download, 
  Database, 
  RefreshCw, 
  Search,
  Eye,
  EyeOff,
  Filter,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type RAGContextType } from '@/lib/rag-michu';

// Familles RAG valides - alignées sur le moteur
const VALID_CONTEXTS: { value: RAGContextType | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes familles' },
  { value: 'apogee', label: 'Apogée' },
  { value: 'apporteurs', label: 'Apporteurs' },
  { value: 'helpconfort', label: 'HelpConfort' },
  { value: 'metier', label: 'Métiers' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'documents', label: 'Documents' },
];

type Document = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  scope: string;
  created_at: string;
  indexed?: boolean;
  chunk_count?: number;
};

export function RagDocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexingDoc, setIndexingDoc] = useState<string | null>(null);
  const [indexingAll, setIndexingAll] = useState(false);
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [contextFilter, setContextFilter] = useState<RAGContextType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'pending'>('all');

  const loadDocuments = async () => {
    setLoading(true);
    
    const docsResult = await safeQuery<Document[]>(
      supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false }),
      'RAG_DOCS_LOAD'
    );

    if (!docsResult.success) {
      logError('rag-docs', 'Error loading documents', docsResult.error);
      errorToast(docsResult.error!);
      setLoading(false);
      return;
    }

    // Get chunk counts per document
    const chunksResult = await safeQuery<{ block_id: string }[]>(
      supabase
        .from('guide_chunks')
        .select('block_id')
        .eq('block_type', 'document'),
      'RAG_DOCS_LOAD_CHUNKS'
    );

    const chunkCounts = new Map<string, number>();
    (chunksResult.data || []).forEach(c => {
      chunkCounts.set(c.block_id, (chunkCounts.get(c.block_id) || 0) + 1);
    });

    setDocuments((docsResult.data || []).map(doc => ({
      ...doc,
      indexed: chunkCounts.has(doc.id),
      chunk_count: chunkCounts.get(doc.id) || 0,
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Filtrage des documents
  const filteredDocuments = documents.filter(doc => {
    // Filtre texte
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!doc.title.toLowerCase().includes(q) && 
          !(doc.description || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // Filtre contexte/famille
    if (contextFilter !== 'all' && doc.scope !== contextFilter) {
      return false;
    }
    
    // Filtre statut
    if (statusFilter === 'indexed' && !doc.indexed) return false;
    if (statusFilter === 'pending' && doc.indexed) return false;
    
    return true;
  });

  const handleIndexDocument = async (doc: Document) => {
    setIndexingDoc(doc.id);
    
    const result = await safeInvoke<{ chunks_created: number }>(
      supabase.functions.invoke('index-document', {
        body: { documentId: doc.id, filePath: doc.file_path },
      }),
      'RAG_DOCS_INDEX'
    );

    if (!result.success) {
      logError('rag-docs', 'Error indexing document', result.error);
      errorToast(result.error!);
      setIndexingDoc(null);
      return;
    }

    successToast('Indexation terminée', `${result.data?.chunks_created || 0} chunks créés`);
    await loadDocuments();
    setIndexingDoc(null);
  };

  const handleIndexAll = async () => {
    const toIndex = filteredDocuments.filter(d => !d.indexed);
    if (toIndex.length === 0) {
      warningToast('Aucun document à indexer');
      return;
    }
    
    setIndexingAll(true);
    let indexed = 0;
    let failed = 0;

    for (const doc of toIndex) {
      const result = await safeInvoke(
        supabase.functions.invoke('index-document', {
          body: { documentId: doc.id, filePath: doc.file_path },
        }),
        'RAG_DOCS_INDEX_ALL'
      );
      
      if (result.success) {
        indexed++;
      } else {
        logError('rag-docs', `Error indexing document ${doc.id}`, result.error);
        failed++;
      }
    }

    successToast('Indexation terminée', `${indexed} documents indexés, ${failed} échecs`);
    await loadDocuments();
    setIndexingAll(false);
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Supprimer "${doc.title}" et ses chunks RAG ?`)) return;

    try {
      // Storage delete
      await supabase.storage.from('documents').remove([doc.file_path]);
    } catch (storageError) {
      logError('rag-docs', 'Storage delete error', storageError);
    }

    // Delete document record
    const deleteDocResult = await safeMutation(
      supabase.from('documents').delete().eq('id', doc.id),
      'RAG_DOCS_DELETE'
    );

    if (!deleteDocResult.success) {
      logError('rag-docs', 'Error deleting document', deleteDocResult.error);
      errorToast(deleteDocResult.error!);
      return;
    }

    // Delete associated chunks
    const deleteChunksResult = await safeMutation(
      supabase.from('guide_chunks').delete().eq('block_id', doc.id),
      'RAG_DOCS_DELETE_CHUNKS'
    );

    if (!deleteChunksResult.success) {
      logError('rag-docs', 'Error deleting chunks', deleteChunksResult.error);
    }

    logInfo('rag-docs', `Document ${doc.id} deleted with chunks`);
    successToast('Document supprimé');
    await loadDocuments();
  };

  const getDownloadUrl = (path: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const notIndexedCount = filteredDocuments.filter(d => !d.indexed).length;
  const indexedCount = filteredDocuments.filter(d => d.indexed).length;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-400">
                Bibliothèque RAG - Consultation uniquement
              </p>
              <p className="text-blue-600/80 dark:text-blue-300/70">
                Pour ajouter de nouveaux documents, utilisez l'onglet <strong>Ingestion</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Context filter */}
            <div className="w-[180px]">
              <Select value={contextFilter} onValueChange={(v) => setContextFilter(v as RAGContextType | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Famille" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_CONTEXTS.map(ctx => (
                    <SelectItem key={ctx.value} value={ctx.value}>{ctx.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'indexed' | 'pending')}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="indexed">Indexés</SelectItem>
                  <SelectItem value="pending">Non indexés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({filteredDocuments.length})
              </CardTitle>
              <CardDescription className="flex gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-green-500" />
                  {indexedCount} indexés
                </span>
                <span className="flex items-center gap-1">
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                  {notIndexedCount} en attente
                </span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              {notIndexedCount > 0 && (
                <Button size="sm" onClick={handleIndexAll} disabled={indexingAll}>
                  {indexingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
                  Indexer ({notIndexedCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {documents.length === 0 
                  ? 'Aucun document dans la bibliothèque' 
                  : 'Aucun document ne correspond aux filtres'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        {doc.indexed ? (
                          <Badge variant="default" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                            <Eye className="w-3 h-3 mr-1" />
                            {doc.chunk_count} chunks
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Non indexé
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-xs">{doc.scope}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={getDownloadUrl(doc.file_path)} target="_blank" rel="noopener noreferrer" title="Télécharger">
                          <Download className="w-3 h-3" />
                        </a>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleIndexDocument(doc)}
                        disabled={indexingDoc === doc.id}
                        title={doc.indexed ? 'Ré-indexer' : 'Indexer'}
                      >
                        {indexingDoc === doc.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Database className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
