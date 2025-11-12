import { useState } from 'react';
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
import { Upload, FileText, Trash2 } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('manuel');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Lire le contenu du fichier
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
      
      // Extraire le nom du fichier comme titre si pas déjà renseigné
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title,
          category,
          content,
          metadata: {
            originalFileName: file?.name,
            fileSize: file?.size,
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
      setFile(null);
      setCategory('manuel');
      
      // Réinitialiser l'input file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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
                  Importer un fichier texte
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".txt,.html,.csv,.json,.md"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Formats acceptés : .txt, .html, .csv, .json, .md
                </p>
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
                <Label htmlFor="category">Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manuel">Manuel utilisateur</SelectItem>
                    <SelectItem value="api">Documentation API</SelectItem>
                    <SelectItem value="tarifs">Tarifs et catalogues</SelectItem>
                    <SelectItem value="tutoriel">Tutoriels et guides</SelectItem>
                    <SelectItem value="technique">Documentation technique</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
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
                    setFile(null);
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
