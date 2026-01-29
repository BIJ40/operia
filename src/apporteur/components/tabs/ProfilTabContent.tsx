/**
 * ProfilTabContent - Contenu de l'onglet Profil
 */

import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building2, LogOut, Shield, Phone } from 'lucide-react';

export default function ProfilTabContent() {
  const { apporteurUser, user, logout, isApporteurAuthenticated } = useApporteurAuth();

  const isDevMode = () => {
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('preview') ||
      hostname.includes('lovable')
    );
  };

  const devBypass = isDevMode() && !isApporteurAuthenticated;

  const handleLogout = async () => {
    if (devBypass) return;
    await logout();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Mon profil
        </h1>
        <p className="text-muted-foreground">
          Gérez vos informations de compte
        </p>
      </div>

      {/* Profile Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {apporteurUser?.firstName || 'Utilisateur'} {apporteurUser?.lastName || ''}
              </h3>
              <Badge variant="outline" className="mt-1">
                {apporteurUser?.role === 'manager' ? 'Gestionnaire' : 'Lecteur'}
              </Badge>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{apporteurUser?.email || user?.email || 'Non renseigné'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{apporteurUser?.apporteurName || 'Organisation non définie'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devBypass ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Mode développement actif — déconnexion désactivée
              </p>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contact Card */}
      <Card className="rounded-2xl bg-muted/30">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">Besoin d'aide ?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Contactez votre agence HelpConfort pour toute question concernant votre compte ou vos dossiers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
