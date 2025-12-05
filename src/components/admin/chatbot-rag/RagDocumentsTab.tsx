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
  AlertTriangle,
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
  source: 'legacy' | 'ingestion'; // Source of the document
  status?: string; // For ingestion documents
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
    
    // Load legacy documents from 'documents' table
    const legacyDocsResult = await safeQuery<{
      id: string;
      title: string;
      description: string | null;
      file_path: string;
      file_type: string;
      scope: string;
      created_at: string;
    }[]>(
      supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false }),
      'RAG_DOCS_LOAD_LEGACY'
    );

    // Load ingestion documents from 'rag_index_documents' table
    const ingestionDocsResult = await safeQuery<{
      id: string;
      filename: string;
      file_path: string | null;
      context_type: string;
      created_at: string;
      status: string;
      chunk_count: number;
      detected_context: string | null;
    }[]>(
      supabase
        .from('rag_index_documents')
        .select('*')
        .order('created_at', { ascending: false }),
      'RAG_DOCS_LOAD_INGESTION'
    );

    if (!legacyDocsResult.success && !ingestionDocsResult.success) {
      logError('rag-docs', 'Error loading documents', legacyDocsResult.error || ingestionDocsResult.error);
      errorToast(legacyDocsResult.error || ingestionDocsResult.error || 'Erreur de chargement');
      setLoading(false);
      return;
    }

    // Get chunk counts per document from guide_chunks
    const chunksResult = await safeQuery<{ block_id: string }[]>(
      supabase
        .from('guide_chunks')
        .select('block_id'),
      'RAG_DOCS_LOAD_CHUNKS'
    );

    const chunkCounts = new Map<string, number>();
    (chunksResult.data || []).forEach(c => {
      chunkCounts.set(c.block_id, (chunkCounts.get(c.block_id) || 0) + 1);
    });

    // Merge both sources
    const allDocs: Document[] = [];

    // Add legacy documents
    (legacyDocsResult.data || []).forEach(doc => {
      allDocs.push({
        ...doc,
        source: 'legacy',
        indexed: chunkCounts.has(doc.id),
        chunk_count: chunkCounts.get(doc.id) || 0,
      });
    });

    // Add ingestion documents (only completed ones)
    (ingestionDocsResult.data || []).forEach(doc => {
      allDocs.push({
        id: doc.id,
        title: doc.filename,
        description: doc.detected_context ? `Contexte: ${doc.detected_context}` : null,
        file_path: doc.file_path || '',
        file_type: doc.filename.split('.').pop() || 'unknown',
        scope: doc.context_type || 'documents',
        created_at: doc.created_at,
        source: 'ingestion',
        status: doc.status,
        indexed: doc.status === 'completed' && doc.chunk_count > 0,
        chunk_count: doc.chunk_count || 0,
      });
    });

    // Sort by date
    allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setDocuments(allDocs);
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
      if (doc.file_path) {
        const bucket = doc.source === 'ingestion' ? 'rag-documents' : 'documents';
        await supabase.storage.from(bucket).remove([doc.file_path]);
      }
    } catch (storageError) {
      logError('rag-docs', 'Storage delete error', storageError);
    }

    // Delete document record from appropriate table
    const tableName = doc.source === 'ingestion' ? 'rag_index_documents' : 'documents';
    const deleteDocResult = await safeMutation(
      supabase.from(tableName).delete().eq('id', doc.id),
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

  const getDownloadUrl = (doc: Document) => {
    if (!doc.file_path) return '#';
    const bucket = doc.source === 'ingestion' ? 'rag-documents' : 'documents';
    const { data } = supabase.storage.from(bucket).getPublicUrl(doc.file_path);
    return data.publicUrl;
  };

  const notIndexedCount = filteredDocuments.filter(d => !d.indexed && d.status !== 'failed').length;
  const indexedCount = filteredDocuments.filter(d => d.indexed).length;
  const failedCount = filteredDocuments.filter(d => d.status === 'failed').length;

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
                {failedCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {failedCount} échec(s)
                  </span>
                )}
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
                <Card key={doc.id} className={`p-3 ${doc.status === 'failed' ? 'border-destructive/50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        {doc.status === 'failed' ? (
                          <Badge variant="destructive" className="text-xs">
                            Échec
                          </Badge>
                        ) : doc.indexed ? (
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
                        {doc.source === 'ingestion' && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                            Ingestion
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
                      {doc.file_path && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={getDownloadUrl(doc)} target="_blank" rel="noopener noreferrer" title="Télécharger">
                            <Download className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                      {doc.source === 'legacy' && (
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
                      )}
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
