/**
 * 401 Unauthorized Error Page
 * Displayed when user auth token is invalid or expired
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Error401() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleRelogin = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full border-l-4 border-l-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Session expirée</CardTitle>
          <CardDescription>
            Votre session n'est plus valide. Veuillez vous reconnecter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRelogin} className="w-full">
            Se reconnecter
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Code erreur: 401 - Unauthorized
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
