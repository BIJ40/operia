import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, FileText, Shield, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AdminIndex() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [indexing, setIndexing] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleIndexRAG = async () => {
    setIndexing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { blockIds: [] },
      });

      if (error) throw error;

      toast({
        title: 'Indexation terminée',
        description: `${data?.blocks_processed || 0} blocs traités, ${data?.chunks_created || 0} chunks créés pour Mme MICHU`,
      });
    } catch (error) {
      console.error('Indexing error:', error);
      toast({
        title: 'Erreur d\'indexation',
        description: error instanceof Error ? error.message : 'Erreur lors de l\'indexation',
        variant: 'destructive',
      });
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administration</h1>
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour accueil
          </Button>
        </Link>
      </div>
      
      <div className="space-y-6">
        {/* Gestion des utilisateurs */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Gestion des utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Utilisateurs
                  </CardTitle>
                  <CardDescription>
                    Créer et gérer les comptes utilisateurs
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/role-permissions">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Permissions par rôle
                  </CardTitle>
                  <CardDescription>
                    Gérer les accès aux catégories par rôle
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Gestion des documents */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Gestion des documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admin/documents">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Documents
                  </CardTitle>
                  <CardDescription>
                    Uploader des fichiers (PDF, Word, etc.) pour les rendre accessibles dans les sections du guide. Ils apparaîtront dans l'onglet "Documents" de chaque catégorie.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Sauvegardes & Bot */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Sauvegardes & Chatbot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admin/backups">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Sauvegardes
                  </CardTitle>
                  <CardDescription>
                    Exporter les guides Apogée, Apporteurs et HelpConfort en JSON
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  MAJ BOT (Mme MICHU)
                </CardTitle>
                <CardDescription className="mb-4">
                  Réindexer le contenu pour mettre à jour le chatbot après modification des guides
                </CardDescription>
                <Button 
                  onClick={handleIndexRAG} 
                  disabled={indexing}
                  className="w-full"
                  size="lg"
                >
                  {indexing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Indexation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Lancer la mise à jour
                    </>
                  )}
                </Button>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
