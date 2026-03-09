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

      {/* Section Utilisateur */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4" />
          Mes informations
        </h2>
        
        <Card className="rounded-2xl border-2 border-primary/20">
          <CardContent className="pt-6 space-y-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devBypass ? (
              <div className="bg-[hsl(var(--ap-warning-light))] border border-[hsl(var(--ap-warning)/.3)] rounded-xl p-4">
                <p className="text-sm text-foreground">
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
      </div>

      {/* Section Organisation */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Mon organisation
        </h2>
        
        <Card className="rounded-2xl border-2 border-secondary/30 bg-secondary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-secondary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {apporteurUser?.apporteurName || 'Organisation non définie'}
                </h3>
                <p className="text-sm text-muted-foreground">Partenaire HelpConfort</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Card */}
        <Card className="rounded-2xl bg-muted/30">
          <CardContent className="py-5">
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
    </div>
  );
}
