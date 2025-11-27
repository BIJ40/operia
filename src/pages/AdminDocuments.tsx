import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDocuments, AdminDocument } from '@/hooks/use-admin-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Trash2, Download, Edit2, MessageSquare, CheckCircle2, AlertCircle, Clock, Database, X, Save } from 'lucide-react';
import { RAGIndexManager } from '@/components/RAGIndexManager';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

export default function AdminDocuments() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('documents');
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
  
  const {
    blocks,
    documents,
    queries,
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
  } = useAdminDocuments();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const pendingCount = queries.filter((q) => q.status === 'pending').length;

  if (!isAdmin) return null;

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
            {/* Upload section */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-3">Uploader un document</h2>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="scope" className="text-xs">Grande catégorie</Label>
                    <Select value={selectedScope} onValueChange={(v) => setSelectedScope(v as any)}>
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
                    <Select value={selectedBlock} onValueChange={setSelectedBlock}>
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
                    placeholder="Description (optionnel)"
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
                    className="h-8 text-sm"
                  />
                </div>

                <Button onClick={handleUpload} disabled={isUploading} className="w-full h-8">
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Upload en cours...' : 'Uploader'}
                </Button>
              </div>
            </Card>

            {/* Documents list */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Documents ({documents.length})</h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-3">
                    {editingDoc === doc.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Titre"
                          className="h-8 text-sm"
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEditing(doc.id)} className="h-7">
                            <Save className="w-3 h-3 mr-1" /> Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing} className="h-7">
                            <X className="w-3 h-3 mr-1" /> Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.description || 'Pas de description'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getBlockTitle(doc.block_id || doc.apporteur_block_id)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={getDownloadUrl(doc.file_path)} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(doc)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleIndex(doc.file_path)}>
                            <Database className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc.id, doc.file_path)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={queryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setQueryFilter('all')}
            >
              Toutes ({queries.length})
            </Button>
            <Button
              size="sm"
              variant={queryFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setQueryFilter('pending')}
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              En attente ({pendingCount})
            </Button>
            <Button
              size="sm"
              variant={queryFilter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setQueryFilter('resolved')}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Résolues
            </Button>
          </div>

          <div className="space-y-3">
            {queries.map((query) => (
              <Card key={query.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{query.question}</p>
                    {query.answer && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{query.answer}</p>
                    )}
                  </div>
                  <Badge variant={query.status === 'pending' ? 'destructive' : query.status === 'resolved' ? 'default' : 'secondary'}>
                    {query.status === 'pending' ? 'En attente' : query.status === 'resolved' ? 'Résolue' : query.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {query.created_at && format(new Date(query.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <Button size="sm" variant="outline" className="h-7" onClick={() => updateQueryStatus(query.id, 'resolved')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Résoudre
                    </Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => updateQueryStatus(query.id, 'pending')}>
                      <Clock className="w-3 h-3 mr-1" /> En attente
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <Textarea
                    placeholder="Notes admin..."
                    value={editingNotes[query.id] ?? query.admin_notes ?? ''}
                    onChange={(e) => setEditingNotes({ ...editingNotes, [query.id]: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                  {editingNotes[query.id] !== undefined && editingNotes[query.id] !== query.admin_notes && (
                    <Button size="sm" className="mt-1 h-7" onClick={() => saveAdminNotes(query.id, editingNotes[query.id])}>
                      Sauvegarder notes
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* RAG Tab */}
        <TabsContent value="rag">
          <RAGIndexManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
