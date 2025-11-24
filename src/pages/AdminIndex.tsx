import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, FileText, Shield } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function AdminIndex() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Administration</h1>
      
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
                    Gérer les documents et fichiers
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Sauvegardes */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Sauvegardes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/admin/backups">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Sauvegardes
                  </CardTitle>
                  <CardDescription>
                    Apogée, Apporteurs et HelpConfort
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/admin/rag">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Index RAG
                  </CardTitle>
                  <CardDescription>
                    Indexation pour Mme MICHU
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
