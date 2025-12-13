import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
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
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

// ✅ SYNCHRONISATION COMPLÈTE: fonction pour invalider TOUTES les query keys utilisateurs
function invalidateAllUserQueries(queryClient: ReturnType<typeof useQueryClient>) {
  ALL_USER_QUERY_PATTERNS.forEach(pattern => {
    queryClient.invalidateQueries({ queryKey: [pattern] });
  });
  queryClient.invalidateQueries({ predicate: (query) => 
    query.queryKey[0] === 'agency-users' || 
    query.queryKey[0] === 'user-profile'
  });
}

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
  phone: string | null;
}

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'assistante': 'Assistante',
  'commercial': 'Commercial',
  'technicien': 'Technicien',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export default function Profile() {
  const { user, isAuthenticated, globalRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editableData, setEditableData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });

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
        .select('id, email, first_name, last_name, agence, role_agence, avatar_url, global_role, enabled_modules, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as ProfileData);
        setAvatarUrl(data.avatar_url);
        setEditableData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || ''
        });
      }
    } catch (error) {
      logError('PROFILE', 'Error loading profile:', error);
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
      
      // ✅ SYNCHRONISATION: Invalider les caches utilisateurs
      invalidateAllUserQueries(queryClient);
    } catch (error) {
      logError('PROFILE', 'Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validation
    if (!editableData.first_name.trim() || !editableData.last_name.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editableData.first_name.trim(),
          last_name: editableData.last_name.trim(),
          phone: editableData.phone.trim() || null
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour avec succès');
      loadProfile();
      
      // ✅ SYNCHRONISATION: Invalider les caches utilisateurs
      invalidateAllUserQueries(queryClient);
    } catch (error) {
      logError('PROFILE', 'Error saving profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
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

        {/* Informations modifiables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Mes informations personnelles
            </CardTitle>
            <CardDescription>
              Vous pouvez modifier ces informations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={editableData.first_name}
                  onChange={(e) => setEditableData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Votre prénom"
                />
              </div>

              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={editableData.last_name}
                  onChange={(e) => setEditableData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Votre nom"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Téléphone</Label>
                <Input
                  type="tel"
                  value={editableData.phone}
                  onChange={(e) => setEditableData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Votre numéro de téléphone"
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving || !editableData.first_name.trim() || !editableData.last_name.trim()}
              className="w-full"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enregistrer mes informations
            </Button>
          </CardContent>
        </Card>

        {/* Informations compte (lecture seule) */}
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
          Pour modifier votre email, agence ou rôle, contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
