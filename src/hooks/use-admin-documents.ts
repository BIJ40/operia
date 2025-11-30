import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast, warningToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';

interface Block {
  id: string;
  title: string;
  parent_id: string | null;
  type: string;
}

export interface AdminDocument {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number | null;
  block_id: string | null;
  apporteur_block_id: string | null;
  scope: string;
  created_at: string;
}

interface ChatbotQuery {
  id: string;
  question: string;
  answer: string | null;
  user_id: string | null;
  status: string | null;
  created_at: string | null;
  admin_notes: string | null;
  is_incomplete: boolean | null;
}

export const useAdminDocuments = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [queries, setQueries] = useState<ChatbotQuery[]>([]);
  const [selectedScope, setSelectedScope] = useState<'apogee' | 'apporteur' | 'helpconfort'>('apogee');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [queryFilter, setQueryFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    loadBlocks();
    loadDocuments();
    loadQueries();
  }, [selectedScope]);

  const loadBlocks = async () => {
    const table = selectedScope === 'apporteur' ? 'apporteur_blocks' : 'blocks';
    
    const result = await safeQuery<Block[]>(
      supabase
        .from(table)
        .select('id, title, parent_id, type')
        .order('order', { ascending: true }),
      'ADMIN_DOCS_BLOCKS_LOAD'
    );

    if (!result.success) {
      logError('admin-documents', 'Error loading blocks', result.error);
      errorToast(result.error!);
      setBlocks([]);
      return;
    }

    setBlocks(result.data ?? []);
  };

  const loadDocuments = async () => {
    const result = await safeQuery<AdminDocument[]>(
      supabase
        .from('documents')
        .select('*')
        .eq('scope', selectedScope)
        .order('created_at', { ascending: false }),
      'ADMIN_DOCS_LIST'
    );

    if (!result.success) {
      logError('admin-documents', 'Error loading documents', result.error);
      errorToast(result.error!);
      setDocuments([]);
      return;
    }

    setDocuments(result.data ?? []);
  };

  const loadQueries = async () => {
    const result = await safeQuery<ChatbotQuery[]>(
      supabase
        .from('chatbot_queries')
        .select('*')
        .order('created_at', { ascending: false }),
      'ADMIN_DOCS_QUERIES_LOAD'
    );

    if (!result.success) {
      logError('admin-documents', 'Error loading queries', result.error);
      errorToast(result.error!);
      setQueries([]);
      return;
    }

    setQueries(result.data ?? []);
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedBlock) {
      warningToast('Veuillez remplir tous les champs requis');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${selectedScope}/${fileName}`;

      // Storage upload - keep try/catch for storage operations
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        logError('admin-documents', 'Storage upload error', uploadError);
        errorToast('Erreur lors de l\'upload du fichier');
        return;
      }

      const blockIdField = selectedScope === 'apporteur' ? 'apporteur_block_id' : 'block_id';

      // DB insert via safeMutation
      const insertResult = await safeMutation(
        supabase.from('documents').insert([
          {
            title,
            description: description || null,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            [blockIdField]: selectedBlock,
            scope: selectedScope,
          },
        ]),
        'ADMIN_DOCS_UPLOAD'
      );

      if (!insertResult.success) {
        logError('admin-documents', 'Error inserting document', insertResult.error);
        errorToast(insertResult.error!);
        return;
      }

      await loadDocuments();
      setTitle('');
      setDescription('');
      setFile(null);
      setSelectedBlock('');
      successToast('Document uploadé avec succès');

      // Index PDF documents via Edge Function
      if (file.type === 'application/pdf') {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
        
        const indexResult = await safeInvoke(
          supabase.functions.invoke('index-document', {
            body: { documentUrl: publicUrl, documentId: filePath },
          }),
          'ADMIN_DOCS_INDEX_RAG'
        );

        if (!indexResult.success) {
          logError('admin-documents', 'Error indexing document', indexResult.error);
          // Non-blocking: document uploaded but indexing failed
          warningToast('Document uploadé mais indexation échouée');
        }
      }
    } catch (error) {
      logError('admin-documents', 'Unexpected error during upload', error);
      errorToast('Erreur inattendue lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Storage delete - keep try/catch for storage operations
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        logError('admin-documents', 'Storage delete error', storageError);
        errorToast('Erreur lors de la suppression du fichier');
        return;
      }

      // DB delete via safeMutation
      const deleteResult = await safeMutation(
        supabase
          .from('documents')
          .delete()
          .eq('id', docId),
        'ADMIN_DOCS_DELETE'
      );

      if (!deleteResult.success) {
        logError('admin-documents', 'Error deleting document from DB', deleteResult.error);
        errorToast(deleteResult.error!);
        return;
      }

      await loadDocuments();
      successToast('Document supprimé');
    } catch (error) {
      logError('admin-documents', 'Unexpected error during delete', error);
      errorToast('Erreur inattendue lors de la suppression');
    }
  };

  const startEditing = (doc: AdminDocument) => {
    setEditingDoc(doc.id);
    setEditTitle(doc.title);
    setEditDescription(doc.description || '');
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditTitle('');
    setEditDescription('');
  };

  const saveEditing = async (docId: string) => {
    const result = await safeMutation(
      supabase
        .from('documents')
        .update({ title: editTitle, description: editDescription })
        .eq('id', docId),
      'ADMIN_DOCS_UPDATE_META'
    );

    if (!result.success) {
      logError('admin-documents', 'Error updating document', result.error);
      errorToast(result.error!);
      return;
    }

    await loadDocuments();
    setEditingDoc(null);
    successToast('Document mis à jour');
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIndex = async (filePath: string) => {
    setIsIndexing(true);
    try {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      
      const result = await safeInvoke(
        supabase.functions.invoke('index-document', {
          body: { documentUrl: publicUrl, documentId: filePath },
        }),
        'ADMIN_DOCS_INDEX_MANUAL'
      );

      if (!result.success) {
        logError('admin-documents', 'Error indexing document', result.error);
        errorToast(result.error!);
        return;
      }

      successToast('Document indexé avec succès');
    } catch (error) {
      logError('admin-documents', 'Unexpected error during indexing', error);
      errorToast('Erreur inattendue lors de l\'indexation');
    } finally {
      setIsIndexing(false);
    }
  };

  const getBlockTitle = (blockId: string | null) => {
    if (!blockId) return 'Non associé';
    const block = blocks.find((b) => b.id === blockId);
    return block?.title || 'Inconnu';
  };

  const updateQueryStatus = async (queryId: string, status: string) => {
    const result = await safeMutation(
      supabase
        .from('chatbot_queries')
        .update({ status })
        .eq('id', queryId),
      'ADMIN_DOCS_QUERY_STATUS_UPDATE'
    );

    if (!result.success) {
      logError('admin-documents', 'Error updating query status', result.error);
      errorToast(result.error!);
      return;
    }

    await loadQueries();
    successToast('Statut mis à jour');
  };

  const saveAdminNotes = async (queryId: string, notes: string) => {
    const result = await safeMutation(
      supabase
        .from('chatbot_queries')
        .update({ admin_notes: notes })
        .eq('id', queryId),
      'ADMIN_DOCS_QUERY_NOTES_SAVE'
    );

    if (!result.success) {
      logError('admin-documents', 'Error saving admin notes', result.error);
      errorToast(result.error!);
      return;
    }

    await loadQueries();
    successToast('Notes enregistrées');
  };

  const filteredQueries = queries.filter((q) => {
    if (queryFilter === 'pending') return q.status === 'pending';
    if (queryFilter === 'resolved') return q.status === 'resolved';
    return true;
  });

  return {
    blocks,
    documents,
    queries: filteredQueries,
    selectedScope,
    selectedBlock,
    title,
    description,
    file,
    isUploading,
    isIndexing,
    editingDoc,
    editTitle,
    editDescription,
    queryFilter,
    setSelectedScope,
    setSelectedBlock,
    setTitle,
    setDescription,
    setFile,
    setEditTitle,
    setEditDescription,
    setQueryFilter,
    handleUpload,
    handleDelete,
    startEditing,
    cancelEditing,
    saveEditing,
    getDownloadUrl,
    handleIndex,
    getBlockTitle,
    updateQueryStatus,
    saveAdminNotes,
    loadDocuments,
    loadQueries,
  };
};
