import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Edit2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Block {
  id: string;
  title: string;
  slug: string;
  type: string;
  parent_id: string | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number | null;
  scope: string;
  block_id: string | null;
  apporteur_block_id: string | null;
  created_at: string;
}

export default function AdminDocuments() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [scope, setScope] = useState<'apogee' | 'apporteur' | 'helpconfort'>('apogee');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBlockId, setEditBlockId] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadBlocks();
    loadDocuments();
  }, [isAdmin, navigate, scope]);

  const loadBlocks = async () => {
    try {
      const tableName = scope === 'apogee' ? 'blocks' : 'apporteur_blocks';
      const { data, error } = await supabase
        .from(tableName)
        .select('id, title, slug, type, parent_id')
        .in('type', ['category', 'subcategory'])
        .order('order');

      if (error) throw error;
      setBlocks(data || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les catégories',
        variant: 'destructive',
      });
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('scope', scope)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !selectedBlockId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${scope}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert document metadata
      const { error: insertError } = await supabase.from('documents').insert({
        title,
        description: description || null,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        scope,
        block_id: scope === 'apogee' ? selectedBlockId : null,
        apporteur_block_id: scope === 'apporteur' ? selectedBlockId : null,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Succès',
        description: 'Document uploadé avec succès',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setFile(null);
      setSelectedBlockId('');
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le document',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Succès',
        description: 'Document supprimé',
      });

      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const startEditing = (doc: Document) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description || '');
    setEditBlockId(doc.scope === 'apogee' ? doc.block_id || '' : doc.apporteur_block_id || '');
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditTitle('');
    setEditDescription('');
    setEditBlockId('');
  };

  const saveEditing = async () => {
    if (!editingDoc || !editTitle || !editBlockId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData: any = {
        title: editTitle,
        description: editDescription || null,
      };

      if (editingDoc.scope === 'apogee') {
        updateData.block_id = editBlockId;
        updateData.apporteur_block_id = null;
      } else {
        updateData.apporteur_block_id = editBlockId;
        updateData.block_id = null;
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', editingDoc.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Document modifié avec succès',
      });

      cancelEditing();
      loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le document',
        variant: 'destructive',
      });
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getBlockTitle = (doc: Document) => {
    const blockId = doc.scope === 'apogee' ? doc.block_id : doc.apporteur_block_id;
    const block = blocks.find(b => b.id === blockId);
    return block?.title || 'Section inconnue';
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestion des documents</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Uploader un document</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="scope">Thème</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as 'apogee' | 'apporteur' | 'helpconfort')}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apogee">APOGEE</SelectItem>
                  <SelectItem value="apporteur">APPORTEURS</SelectItem>
                  <SelectItem value="helpconfort">HELPCONFORT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="block">Catégorie / Sous-catégorie</Label>
              <Select value={selectedBlockId} onValueChange={setSelectedBlockId}>
                <SelectTrigger id="block">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.type === 'category' ? '📁 ' : '📂 '}
                      {block.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Titre du document</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Guide de procédure"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du document..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="file">Fichier</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Upload en cours...' : 'Uploader'}
            </Button>
          </div>
        </Card>

        {/* Documents list */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Documents uploadés</h2>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-2">
                {editingDoc?.id === doc.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="edit-title">Titre</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-block">Catégorie / Sous-catégorie</Label>
                      <Select value={editBlockId} onValueChange={setEditBlockId}>
                        <SelectTrigger id="edit-block">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {blocks.map((block) => (
                            <SelectItem key={block.id} value={block.id}>
                              {block.type === 'category' ? '📁 ' : '📂 '}
                              {block.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={cancelEditing}>
                        Annuler
                      </Button>
                      <Button size="sm" onClick={saveEditing}>
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode - compact single line
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
                        <span className="font-medium truncate">{doc.title}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground truncate">{getBlockTitle(doc)}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(getDownloadUrl(doc.file_path), '_blank')}
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => startEditing(doc)}
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
            {documents.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground">
                Aucun document pour ce thème
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
