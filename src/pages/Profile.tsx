import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Building2, 
  Briefcase, 
  Mail, 
  Shield, 
  Zap,
  Loader2,
  Camera,
  Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GLOBAL_ROLE_LABELS, GLOBAL_ROLE_COLORS, GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, EnabledModules } from '@/types/modules';

interface ProfileData {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  role_agence: string | null;
  avatar_url: string | null;
  global_role: GlobalRole | null;
  enabled_modules: EnabledModules | null;
}

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export default function Profile() {
  const { user, isAuthenticated, globalRole } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, role_agence, avatar_url, global_role, enabled_modules')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as ProfileData);
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Impossible de charger le profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('category-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const getEnabledModulesList = (modules: EnabledModules | null): string[] => {
    if (!modules) return [];
    
    return MODULE_DEFINITIONS.filter(mod => {
      const state = modules[mod.key];
      if (typeof state === 'boolean') return state;
      if (typeof state === 'object') return state.enabled;
      return false;
    }).map(mod => mod.label);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveRole = profile?.global_role || globalRole;
  const enabledModules = getEnabledModulesList(profile?.enabled_modules);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header avec Avatar */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Mon Profil'
                  }
                </CardTitle>
                <CardDescription className="text-base">
                  {profile?.email || 'Pas d\'email'}
                </CardDescription>
                {effectiveRole && (
                  <Badge className={`mt-2 ${GLOBAL_ROLE_COLORS[effectiveRole] || ''}`}>
                    N{GLOBAL_ROLES[effectiveRole]} – {GLOBAL_ROLE_LABELS[effectiveRole]}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Informations utilisateur (lecture seule) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Informations du compte
            </CardTitle>
            <CardDescription>
              Ces informations sont gérées par votre administrateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Prénom</Label>
                <Input
                  value={profile?.first_name || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="Non renseigné"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Nom</Label>
                <Input
                  value={profile?.last_name || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="Non renseigné"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Agence
                </Label>
                <Input
                  value={profile?.agence || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="Non rattaché"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  Poste occupé
                </Label>
                <Input
                  value={ROLE_AGENCE_LABELS[profile?.role_agence || ''] || profile?.role_agence || ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="Non renseigné"
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Modules activés */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-4 h-4" />
                Modules activés
              </Label>
              <div className="flex flex-wrap gap-2">
                {enabledModules.length > 0 ? (
                  enabledModules.map((mod) => (
                    <Badge key={mod} variant="secondary">
                      {mod}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Aucun module spécifique</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            Retour
          </Button>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Pour modifier vos informations de compte (email, nom, agence, rôle), 
          contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
