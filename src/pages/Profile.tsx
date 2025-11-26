import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Building2, Briefcase, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  avatar_url: string | null;
}

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agence, setAgence] = useState('');
  const [roleAgence, setRoleAgence] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    loadProfile();
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAgence(data.agence || '');
        setRoleAgence(data.role_agence || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le profil',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="w-6 h-6" />
              Mon Profil
            </CardTitle>
            <CardDescription className="text-white/90">
              Consultez vos informations personnelles et professionnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="Non renseigné"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="Non renseigné"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="Non renseigné"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agence" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Agence Help Confort
                  </Label>
                  <Input
                    id="agence"
                    value={agence}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="Non renseigné"
                  />
                  <p className="text-xs text-muted-foreground">
                    Défini par l'administrateur
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="roleAgence" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Rôle dans l'agence
                  </Label>
                  <Input
                    id="roleAgence"
                    value={roleAgence}
                    disabled
                    className="bg-muted cursor-not-allowed"
                    placeholder="Non renseigné"
                  />
                  <p className="text-xs text-muted-foreground">
                    Défini par l'administrateur
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Retour
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground pt-2">
                Pour toute autre modification, contactez votre administrateur
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
