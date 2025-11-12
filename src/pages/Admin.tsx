import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Plus } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('manuel');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [categories, setCategories] = useState<string[]>([
    'manuel',
    'api',
    'tarifs',
    'tutoriel',
    'technique',
    'apporteurs',
    'devis',
    'fondamentaux'
  ]);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Charger les catégories existantes
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('category');
      
      if (error) throw error;
      
      if (data) {
        const uniqueCategories = Array.from(new Set(data.map(d => d.category)));
        const allCategories = Array.from(new Set([...categories, ...uniqueCategories]));
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const handleAddCategory = () => {
    if (customCategory.trim()) {
      const newCategories = [...categories, customCategory.trim()];
      setCategories(newCategories);
      setCategory(customCategory.trim());
      setCustomCategory('');
      setShowCustomCategory(false);
      toast({
        title: 'Catégorie ajoutée',
        description: `La catégorie "${customCategory}" a été créée.`,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    
    // Si plusieurs fichiers, on les traite tous
    if (selectedFiles.length > 1) {
      await handleBatchUpload(selectedFiles);
    } else {
      // Un seul fichier : comportement classique
      const selectedFile = selectedFiles[0];
      setIsParsing(true);
      
      const fileType = selectedFile.type;
      const fileName = selectedFile.name.toLowerCase();
      
      // Extraire le nom comme titre si pas déjà renseigné
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }

      try {
        // PDFs et images : nécessitent un parsing spécial
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || 
            fileType.startsWith('image/') || 
            ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.endsWith(ext))) {
          
          toast({
            title: 'Traitement en cours...',
            description: 'Extraction du contenu du document (peut prendre jusqu\'à 1 minute)',
          });

          // Créer un FormData pour envoyer le fichier
          const formData = new FormData();
          formData.append('file', selectedFile);

          // Envoyer au backend pour parsing
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Erreur lors du parsing du document');
          }

          const result = await response.json();
          setContent(result.content || 'Impossible d\'extraire le contenu');
          
          toast({
            title: 'Document traité',
            description: 'Le contenu a été extrait avec succès',
          });
        } else {
          // Fichiers texte : lecture simple
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            setContent(text);
          };
          reader.readAsText(selectedFile);
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de traiter ce fichier. Essayez de copier-coller le contenu manuellement.',
          variant: 'destructive',
        });
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleBatchUpload = async (selectedFiles: File[]) => {
    setIsLoading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      try {
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        let extractedContent = '';

        // Déterminer la catégorie automatiquement basée sur le nom du fichier
        let autoCategory = 'manuel';
        if (fileName.includes('api')) autoCategory = 'api';
        else if (fileName.includes('tarif')) autoCategory = 'tarifs';
        else if (fileName.includes('tuto') || fileName.includes('guide')) autoCategory = 'tutoriel';
        else if (fileName.includes('apporteur')) autoCategory = 'apporteurs';
        else if (fileName.includes('devis')) autoCategory = 'devis';
        else if (fileName.includes('fondament')) autoCategory = 'fondamentaux';

        // Parse le fichier
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || 
            fileType.startsWith('image/') || 
            ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fileName.endsWith(ext))) {
          
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            extractedContent = result.content || 'Contenu non extrait';
          } else {
            extractedContent = `[Fichier ${file.name}] - Contenu à extraire manuellement`;
          }
        } else {
          // Fichier texte
          const text = await file.text();
          extractedContent = text;
        }

        // Insérer dans la base
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ""),
            category: autoCategory,
            content: extractedContent,
            metadata: {
              originalFileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedAt: new Date().toISOString(),
            }
          });

        if (error) throw error;
        successCount++;

      } catch (error) {
        console.error(`Erreur pour ${file.name}:`, error);
        errorCount++;
      }
    }

    setIsLoading(false);
    setUploadProgress({ current: 0, total: 0 });

    toast({
      title: 'Import terminé',
      description: `${successCount} document(s) importé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
    });

    // Réinitialiser
    setFiles([]);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    loadCategories();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const finalCategory = showCustomCategory && customCategory.trim() 
        ? customCategory.trim() 
        : category;

      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title,
          category: finalCategory,
          content,
          metadata: {
            originalFileName: files[0]?.name,
            fileSize: files[0]?.size,
            fileType: files[0]?.type,
            uploadedAt: new Date().toISOString(),
          }
        });

      if (error) throw error;

      toast({
        title: 'Document ajouté',
        description: 'Le document a été ajouté à la base de connaissances de Mme Michu.',
      });

      // Réinitialiser le formulaire
      setTitle('');
      setContent('');
      setFiles([]);
      setCategory('manuel');
      setCustomCategory('');
      setShowCustomCategory(false);
      
      // Réinitialiser l'input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Recharger les catégories
      loadCategories();

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le document.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            ← Retour au guide
          </Button>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Administration - Base de connaissances
            </CardTitle>
            <CardDescription>
              Enrichissez la base de connaissances de Mme Michu avec de nouveaux documents
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload">
                  Importer un fichier
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.html,.csv,.json,.md,.pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    className="flex-1"
                    disabled={isParsing || isLoading}
                    multiple
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Formats acceptés : .txt, .html, .csv, .json, .md, .pdf, .jpg, .jpeg, .png, .webp
                  <br />
                  💡 Sélectionnez plusieurs fichiers pour un import en batch
                </p>
                {isParsing && (
                  <p className="text-sm text-primary font-medium">
                    ⏳ Extraction du contenu en cours...
                  </p>
                )}
                {uploadProgress.total > 0 && (
                  <p className="text-sm text-primary font-medium">
                    📤 Import en cours : {uploadProgress.current} / {uploadProgress.total}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Titre du document</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Manuel utilisateur V9"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Catégorie</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomCategory(!showCustomCategory)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {showCustomCategory ? 'Liste' : 'Nouvelle'}
                  </Button>
                </div>
                
                {showCustomCategory ? (
                  <div className="flex gap-2">
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Nom de la catégorie..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!customCategory.trim()}
                      size="sm"
                    >
                      Ajouter
                    </Button>
                  </div>
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-popover">
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
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Le contenu sera automatiquement rempli lors de l'import du fichier..."
                  className="min-h-[300px] font-mono text-sm"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {content.length.toLocaleString()} caractères
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Ajout en cours...' : 'Ajouter à la base de connaissances'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTitle('');
                    setContent('');
                    setFiles([]);
                    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Effacer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="max-w-4xl mx-auto mt-6">
          <CardHeader>
            <CardTitle>Import rapide des documents</CardTitle>
            <CardDescription>
              Vous avez 45 fichiers à importer ? Utilisez cette fonction pour les importer en batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Pour importer plusieurs fichiers rapidement, utilisez le formulaire ci-dessus pour chaque document.
              Les fichiers suivants sont recommandés pour enrichir Mme Michu :
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Manuels utilisateurs (V4, V8, V9)</li>
              <li>Documentation API (tutoriels, relations, endpoints)</li>
              <li>Exports de données (pour contexte)</li>
              <li>Tutoriels vocaux et guides métier</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
