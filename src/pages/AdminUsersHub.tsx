import { Link } from 'react-router-dom';
import { UserPlus, Users, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHasGlobalRole } from '@/hooks/useHasGlobalRole';

export default function AdminUsersHub() {
  const canAccessAdmin = useHasGlobalRole('platform_admin'); // N5+

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Gestion des Utilisateurs
        </h1>
        <p className="text-muted-foreground">
          Créez et gérez les comptes utilisateurs de la plateforme
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {/* Créer un utilisateur */}
        <Link to="/admin/users/create">
          <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                  <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-1">Créer un utilisateur</CardTitle>
              <CardDescription className="text-sm">
                Ajouter un nouveau compte utilisateur
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Liste des utilisateurs */}
        <Link to="/admin/users/list">
          <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-1">Liste des utilisateurs</CardTitle>
              <CardDescription className="text-sm">
                Consulter et modifier les profils
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        {/* Gestion des droits - N5+ only */}
        {canAccessAdmin && (
          <Link to="/admin/users/permissions">
            <Card className="group h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">Gestion des droits</CardTitle>
                <CardDescription className="text-sm">
                  Configurer les rôles et permissions V2
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
