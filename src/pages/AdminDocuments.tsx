import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Edit2, MessageSquare, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RAGIndexManager } from '@/components/RAGIndexManager';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ChatbotQuery {
  id: string;
  user_id: string | null;
  question: string;
  answer: string | null;
  is_incomplete: boolean;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
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
  const [indexingDoc, setIndexingDoc] = useState<string | null>(null);
  const [indexProgress, setIndexProgress] = useState(0);
  
  // Chatbot queries state
  const [queries, setQueries] = useState<ChatbotQuery[]>([]);
  const [queryFilter, setQueryFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadBlocks();
    loadDocuments();
    loadQueries();
  }, [isAdmin, navigate, scope]);

  const loadBlocks = async () => {
    try {
      let data: Block[] = [];
      
      if (scope === 'helpconfort') {
        const { data: blocksData, error } = await supabase
          .from('blocks')
          .select('id, title, slug, type, parent_id')
          .like('slug', 'helpconfort-%')
          .in('type', ['category', 'section'])
          .order('order');
        
        if (error) throw error;
        data = blocksData || [];
      } else {
        const tableName = scope === 'apogee' ? 'blocks' : 'apporteur_blocks';
        const { data: blocksData, error } = await supabase
          .from(tableName)
          .select('id, title, slug, type, parent_id')
          .in('type', ['category', 'subcategory'])
          .order('order');

        if (error) throw error;
        data = blocksData || [];
      }
      
      setBlocks(data);
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${scope}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: insertedDoc, error: insertError } = await supabase.from('documents').insert({
        title,
        description: description || null,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        scope,
        block_id: scope === 'apogee' || scope === 'helpconfort' ? selectedBlockId : null,
        apporteur_block_id: scope === 'apporteur' ? selectedBlockId : null,
      }).select().single();

      if (insertError) throw insertError;

      if (file.type.includes('text') || file.type.includes('plain')) {
        try {
          await supabase.functions.invoke('index-document', {
            body: { 
              documentId: insertedDoc.id,
              filePath: filePath
            }
          });
          
          toast({
            title: 'Succès',
            description: 'Document uploadé et indexé',
          });
        } catch (indexError) {
          toast({
            title: 'Attention',
            description: 'Document uploadé mais non indexé',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Succès',
          description: 'Document uploadé',
        });
      }

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
    if (!confirm('Supprimer ce document ?')) return;

    try {
      await supabase.storage.from('documents').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id);

      toast({ title: 'Succès', description: 'Document supprimé' });
      loadDocuments();
    } catch (error) {
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
        description: 'Champs requis manquants',
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

      await supabase.from('documents').update(updateData).eq('id', editingDoc.id);

      toast({ title: 'Succès', description: 'Document modifié' });
      cancelEditing();
      loadDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier',
        variant: 'destructive',
      });
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIndex = async (doc: Document) => {
    setIndexingDoc(doc.id);
    setIndexProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setIndexProgress(prev => (prev >= 95 ? prev : prev + 5));
      }, 200);

      const { data, error } = await supabase.functions.invoke('index-document', {
        body: { 
          documentId: doc.id,
          filePath: doc.file_path
        }
      });

      clearInterval(progressInterval);
      setIndexProgress(100);

      if (error) throw error;

      setTimeout(() => {
        toast({
          title: 'Succès',
          description: `Document indexé: ${data.chunks_created} chunks créés`,
        });
        setIndexingDoc(null);
        setIndexProgress(0);
      }, 500);
    } catch (error) {
      setIndexingDoc(null);
      setIndexProgress(0);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'indexer',
        variant: 'destructive',
      });
    }
  };

  const getBlockTitle = (doc: Document) => {
    const blockId = doc.scope === 'apporteur' ? doc.apporteur_block_id : doc.block_id;
    const block = blocks.find(b => b.id === blockId);
    return block?.title || 'Section inconnue';
  };

  // Chatbot queries functions
  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQueries(data || []);
    } catch (error) {
      console.error('Erreur chargement requêtes:', error);
    }
  };

  const updateQueryStatus = async (queryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('chatbot_queries')
        .update({ status: newStatus, reviewed_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', queryId);

      if (error) throw error;

      toast({
        title: 'Statut mis à jour',
      });

      loadQueries();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour',
        variant: 'destructive',
      });
    }
  };

  const saveAdminNotes = async (queryId: string) => {
    try {
      await supabase
        .from('chatbot_queries')
        .update({ admin_notes: editingNotes[queryId] })
        .eq('id', queryId);

      toast({ title: 'Notes sauvegardées' });

      setEditingNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[queryId];
        return newNotes;
      });

      loadQueries();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    }
  };

  const filteredQueries = queries.filter((q) => {
    if (queryFilter === 'all') return true;
    return q.status === queryFilter;
  });

  const pendingCount = queries.filter((q) => q.status === 'pending').length;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Mme MICHU
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestion des documents et des questions du chatbot
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Questions
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rag" className="gap-2">
            <Database className="w-4 h-4" />
            RAG Index
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload section - Compact */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Uploader un document</h2>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="scope" className="text-xs">Grande catégorie</Label>
                    <Select value={scope} onValueChange={(v) => setScope(v as 'apogee' | 'apporteur' | 'helpconfort')}>
                      <SelectTrigger id="scope" className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apogee">Apogée</SelectItem>
                        <SelectItem value="apporteur">Apporteurs</SelectItem>
                        <SelectItem value="helpconfort">HelpConfort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="block" className="text-xs">Catégorie</Label>
                    <Select value={selectedBlockId} onValueChange={setSelectedBlockId}>
                      <SelectTrigger id="block" className="h-8 text-sm">
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
                </div>

                <div>
                  <Label htmlFor="title" className="text-xs">Titre</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du document"
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="file" className="text-xs">Fichier</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    className="h-8 text-sm"
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <Button onClick={handleUpload} disabled={uploading} className="w-full h-8 text-sm">
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  {uploading ? 'Upload...' : 'Uploader'}
                </Button>
              </div>
            </Card>

            {/* Documents list */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Documents uploadés</h2>
              
              {indexingDoc && (
                <div className="mb-3 p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Indexation...</span>
                    <span className="text-muted-foreground">{indexProgress}%</span>
                  </div>
                  <div className="grid grid-cols-20 gap-1 h-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-sm transition-colors ${
                          i < Math.floor(indexProgress / 5) ? 'bg-primary' : 'bg-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-2">
                    {editingDoc?.id === doc.id ? (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs">Titre</Label>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={1}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Catégorie</Label>
                          <Select value={editBlockId} onValueChange={setEditBlockId}>
                            <SelectTrigger className="h-7 text-sm">
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
                          <Button size="sm" variant="outline" onClick={cancelEditing} className="h-7 text-xs">
                            Annuler
                          </Button>
                          <Button size="sm" onClick={saveEditing} className="h-7 text-xs">
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <div className="flex items-center gap-2 flex-1 min-w-0 text-xs">
                            <span className="font-medium truncate">{doc.title}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground truncate">{getBlockTitle(doc)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleIndex(doc)}
                            disabled={indexingDoc === doc.id}
                            title="Indexer"
                          >
                            <Database className={`w-3.5 h-3.5 ${indexingDoc === doc.id ? 'animate-pulse' : ''}`} />
                          </Button>
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
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    Aucun document pour ce thème
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <Tabs value={queryFilter} onValueChange={(v) => setQueryFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="gap-2 text-sm">
                <MessageSquare className="w-3.5 h-3.5" />
                Toutes ({queries.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2 text-sm">
                <AlertCircle className="w-3.5 h-3.5" />
                En attente ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Résolues ({queries.filter((q) => q.status === 'resolved').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={queryFilter} className="space-y-3 mt-4">
              {filteredQueries.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Aucune requête
                  </CardContent>
                </Card>
              ) : (
                filteredQueries.map((query) => (
                  <Card key={query.id} className={query.is_incomplete ? 'border-l-4 border-l-destructive' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm">{query.user_pseudo}</CardTitle>
                            {query.is_incomplete && (
                              <Badge variant="destructive" className="text-xs">Incomplète</Badge>
                            )}
                            <Badge variant={query.status === 'resolved' ? 'default' : 'secondary'} className="text-xs">
                              {query.status === 'resolved' ? 'Résolue' : 'En attente'}
                            </Badge>
                          </div>
                          <CardDescription className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3" />
                            {format(new Date(query.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </CardDescription>
                        </div>
                        {query.status !== 'resolved' && (
                          <Button
                            size="sm"
                            onClick={() => updateQueryStatus(query.id, 'resolved')}
                            disabled={query.is_incomplete}
                            className="h-7 text-xs"
                            title={query.is_incomplete ? "Impossible de résoudre une réponse incomplète" : "Marquer comme résolue"}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <h4 className="font-semibold mb-1 text-xs">Question :</h4>
                        <p className="text-xs bg-muted p-2 rounded">{query.question}</p>
                      </div>
                      
                      {query.answer && (
                        <div>
                          <h4 className="font-semibold mb-1 text-xs">Réponse :</h4>
                          <p className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{query.answer}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-1 text-xs">Notes :</h4>
                        <Textarea
                          placeholder="Notes internes..."
                          value={editingNotes[query.id] ?? query.admin_notes ?? ''}
                          onChange={(e) =>
                            setEditingNotes((prev) => ({ ...prev, [query.id]: e.target.value }))
                          }
                          className="min-h-[60px] text-xs"
                        />
                        {(editingNotes[query.id] !== undefined) && (
                          <Button
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={() => saveAdminNotes(query.id)}
                          >
                            Sauvegarder
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* RAG Index Tab */}
        <TabsContent value="rag">
          <RAGIndexManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
