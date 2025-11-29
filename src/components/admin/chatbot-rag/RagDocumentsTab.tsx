import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Trash2, Download, Database, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Document = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  scope: string;
  created_at: string;
  indexed?: boolean;
};

export function RagDocumentsTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexingDoc, setIndexingDoc] = useState<string | null>(null);
  const [indexingAll, setIndexingAll] = useState(false);
  
  // Upload form
  const [family, setFamily] = useState<string>('apogee');
  const [module, setModule] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  
  const { toast } = useToast();

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which docs are indexed
      const { data: chunks } = await supabase
        .from('guide_chunks')
        .select('block_id')
        .eq('block_type', 'document');

      const indexedIds = new Set(chunks?.map(c => c.block_id) || []);

      setDocuments((docs || []).map(doc => ({
        ...doc,
        indexed: indexedIds.has(doc.id),
      })));
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file || !title) {
      toast({
        title: 'Erreur',
        description: 'Titre et fichier requis',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `chatbot/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_type: file.type,
          scope: family,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Succès',
        description: 'Document uploadé',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setModule('');
      setFile(null);
      await loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleIndexDocument = async (doc: Document) => {
    setIndexingDoc(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('index-document', {
        body: { documentId: doc.id, filePath: doc.file_path },
      });

      if (error) throw error;

      toast({
        title: 'Indexation terminée',
        description: `${data.chunks_created} chunks créés`,
      });

      await loadDocuments();
    } catch (error) {
      console.error('Indexing error:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'indexation',
        variant: 'destructive',
      });
    } finally {
      setIndexingDoc(null);
    }
  };

  const handleIndexAll = async () => {
    setIndexingAll(true);
    let indexed = 0;
    let failed = 0;

    for (const doc of documents.filter(d => !d.indexed)) {
      try {
        await supabase.functions.invoke('index-document', {
          body: { documentId: doc.id, filePath: doc.file_path },
        });
        indexed++;
      } catch {
        failed++;
      }
    }

    toast({
      title: 'Indexation terminée',
      description: `${indexed} documents indexés, ${failed} échecs`,
    });

    await loadDocuments();
    setIndexingAll(false);
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      await supabase.storage.from('documents').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id);
      await supabase.from('guide_chunks').delete().eq('block_id', doc.id);

      toast({ title: 'Document supprimé' });
      await loadDocuments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const getDownloadUrl = (path: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const notIndexedCount = documents.filter(d => !d.indexed).length;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Uploader un document
          </CardTitle>
          <CardDescription>
            Ajoutez des documents pour enrichir la base de connaissances du chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label>Famille</Label>
                <Select value={family} onValueChange={setFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apogee">Apogée</SelectItem>
                    <SelectItem value="apporteurs">Apporteurs</SelectItem>
                    <SelectItem value="helpconfort">HelpConfort</SelectItem>
                    <SelectItem value="juridique">Juridique</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Module (optionnel)</Label>
                <Input
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  placeholder="Ex: Facturation, RT, SAV..."
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Titre</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du document"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optionnel)"
                  rows={2}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="ml-2">Uploader</span>
            </Button>
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
                Documents ({documents.length})
              </CardTitle>
              <CardDescription>
                {notIndexedCount > 0 && `${notIndexedCount} document(s) non indexé(s)`}
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
                  Indexer tous ({notIndexedCount})
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
          ) : documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun document</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{doc.title}</p>
                        {doc.indexed ? (
                          <Badge variant="default" className="text-xs">Indexé</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Non indexé</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.description || 'Pas de description'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{doc.scope}</Badge>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleIndexDocument(doc)}
                        disabled={indexingDoc === doc.id}
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
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(doc)}
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
