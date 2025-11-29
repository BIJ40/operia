import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Search, Trash2, Edit, Save, X } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  category: string;
  content: string;
  created_at: string;
  metadata?: any;
}

// Route protégée par RoleGuard dans App.tsx
export default function Documents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      // Charger seulement les métadonnées, pas le contenu complet
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, category, created_at, metadata')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Ajouter une propriété content vide pour la compatibilité
        const docsWithEmptyContent = data.map(doc => ({
          ...doc,
          content: '' // Le contenu sera chargé à la demande lors de l'édition
        }));
        setDocuments(docsWithEmptyContent);
        const uniqueCategories = Array.from(new Set(data.map(d => d.category)));
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les documents',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Mettre à jour immédiatement la liste locale
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
      
      toast({
        title: 'Document supprimé',
        description: `"${title}" a été supprimé.`,
      });
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!confirm('Supprimer tous les documents en double ? Seule la version la plus récente sera conservée.')) return;
    
    setIsLoading(true);
    try {
      console.log('Suppression des doublons...');
      
      // Récupérer tous les documents avec leur date
      const { data: allDocs, error: fetchError } = await supabase
        .from('knowledge_base')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      if (allDocs) {
        // Grouper par titre et garder seulement le premier (le plus récent) de chaque groupe
        const seenTitles = new Set<string>();
        const idsToKeep = new Set<string>();
        
        allDocs.forEach(doc => {
          if (!seenTitles.has(doc.title)) {
            seenTitles.add(doc.title);
            idsToKeep.add(doc.id);
          }
        });
        
        // Identifier les IDs à supprimer
        const idsToDelete = allDocs.filter(doc => !idsToKeep.has(doc.id)).map(doc => doc.id);
        
        console.log(`Suppression de ${idsToDelete.length} doublons...`);
        
        // Supprimer les doublons
        for (const id of idsToDelete) {
          await supabase.from('knowledge_base').delete().eq('id', id);
        }
        
        toast({
          title: 'Nettoyage terminé',
          description: `${idsToDelete.length} doublon(s) supprimé(s)`,
        });
      }
      
      // Recharger la liste
      await loadDocuments();
    } catch (error) {
      console.error('Erreur nettoyage doublons:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de nettoyer les doublons',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = async (doc: Document) => {
    // Charger le contenu complet seulement maintenant
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('id', doc.id)
      .single();
    
    if (error) {
      console.error('Erreur chargement contenu:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le contenu du document',
        variant: 'destructive',
      });
      return;
    }
    
    setEditingDoc(doc.id);
    setEditForm({
      title: doc.title,
      category: doc.category,
      content: data?.content || '',
    });
  };

  const cancelEditing = () => {
    setEditingDoc(null);
    setEditForm({ title: '', category: '', content: '' });
  };

  const saveEditing = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          title: editForm.title,
          category: editForm.category,
          content: editForm.content,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Document mis à jour',
        description: 'Les modifications ont été enregistrées.',
      });
      
      setEditingDoc(null);
      loadDocuments();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={() => navigate(ROUTES.admin.index)}>
            ← Retour à l'import
          </Button>
          <div className="flex items-center gap-4">
            {documents.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDeleteDuplicates}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Nettoyer les doublons
              </Button>
            )}
            <div className="text-sm text-muted-foreground">
              {documents.length} document(s) total
            </div>
          </div>
        </div>

        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestion des documents
            </CardTitle>
            <CardDescription>
              Visualisez, recherchez et modifiez les documents de la base de connaissances
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Rechercher</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Titre ou contenu..."
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category-filter">Catégorie</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Liste des documents */}
            <div className="space-y-4">
              {filteredDocuments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun document trouvé
                </p>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-6">
                      {editingDoc === doc.id ? (
                        // Mode édition
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Titre</Label>
                            <Input
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Catégorie</Label>
                            <Select
                              value={editForm.category}
                              onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat} className="capitalize">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Contenu</Label>
                            <Textarea
                              value={editForm.content}
                              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              {editForm.content.length.toLocaleString()} caractères
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveEditing(doc.id)}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Enregistrer
                            </Button>
                            <Button
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Mode affichage
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{doc.title}</h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="capitalize px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                                  {doc.category}
                                </span>
                                {doc.metadata?.fileSize && (
                                  <span>
                                    {(doc.metadata.fileSize / 1024).toFixed(0)} KB
                                  </span>
                                )}
                                <span>
                                  {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditing(doc)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(doc.id, doc.title)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-3 rounded-md font-mono">
                            {doc.metadata?.originalFileName && (
                              <span className="text-xs">
                                Fichier: {doc.metadata.originalFileName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
