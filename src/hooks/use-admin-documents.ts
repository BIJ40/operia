import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Block {
  id: string;
  title: string;
  parent_id: string | null;
  type: string;
}

interface Document {
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
  user_pseudo: string | null;
  status: string | null;
  created_at: string | null;
  admin_notes: string | null;
  is_incomplete: boolean | null;
}

export const useAdminDocuments = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
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
    try {
      const table = selectedScope === 'apporteur' ? 'apporteur_blocks' : 'blocks';
      const { data, error } = await supabase
        .from(table)
        .select('id, title, parent_id, type')
        .order('order', { ascending: true });

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast.error('Erreur lors du chargement des blocs');
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('scope', selectedScope)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erreur lors du chargement des documents');
    }
  };

  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error('Error loading queries:', error);
      toast.error('Erreur lors du chargement des questions');
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedBlock) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${selectedScope}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const blockIdField = selectedScope === 'apporteur' ? 'apporteur_block_id' : 'block_id';

      const { error: insertError } = await supabase.from('documents').insert([
        {
          title,
          description: description || null,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          [blockIdField]: selectedBlock,
          scope: selectedScope,
        },
      ]);

      if (insertError) throw insertError;

      await loadDocuments();
      setTitle('');
      setDescription('');
      setFile(null);
      setSelectedBlock('');
      toast.success('Document uploadé avec succès');

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      
      if (file.type === 'application/pdf') {
        await supabase.functions.invoke('index-document', {
          body: { documentUrl: publicUrl, documentId: filePath },
        });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      await loadDocuments();
      toast.success('Document supprimé');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const startEditing = (doc: Document) => {
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
    try {
      const { error } = await supabase
        .from('documents')
        .update({ title: editTitle, description: editDescription })
        .eq('id', docId);

      if (error) throw error;

      await loadDocuments();
      setEditingDoc(null);
      toast.success('Document mis à jour');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIndex = async (filePath: string) => {
    setIsIndexing(true);
    try {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      
      const { error } = await supabase.functions.invoke('index-document', {
        body: { documentUrl: publicUrl, documentId: filePath },
      });

      if (error) throw error;
      toast.success('Document indexé avec succès');
    } catch (error) {
      console.error('Error indexing document:', error);
      toast.error('Erreur lors de l\'indexation');
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
    try {
      const { error } = await supabase
        .from('chatbot_queries')
        .update({ status })
        .eq('id', queryId);

      if (error) throw error;
      await loadQueries();
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const saveAdminNotes = async (queryId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_queries')
        .update({ admin_notes: notes })
        .eq('id', queryId);

      if (error) throw error;
      await loadQueries();
      toast.success('Notes enregistrées');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
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
