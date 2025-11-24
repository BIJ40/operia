import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, FileText } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function AdminIndex() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/admin/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestion des utilisateurs
              </CardTitle>
              <CardDescription>
                Créer et gérer les comptes utilisateurs
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/documents">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

        <Link to="/admin/backup">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Sauvegarde Apogée
              </CardTitle>
              <CardDescription>
                Exporter et sauvegarder les données Apogée
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/helpconfort-backup">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Sauvegarde HelpConfort
              </CardTitle>
              <CardDescription>
                Exporter et sauvegarder les données HelpConfort
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
