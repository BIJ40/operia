import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge as usePermissions } from '@/hooks/usePermissionsBridge';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  User, 
  Briefcase, 
  Mail, 
  Shield, 
  Zap,
  Loader2,
  Camera,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { GlobalRole } from '@/types/globalRoles';
import { VISIBLE_ROLE_LABELS, VISIBLE_ROLE_COLORS } from '@/lib/visibleRoleLabels';
import { MODULE_DEFINITIONS } from '@/types/modules';
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';
import { WarmPageContainer } from '@/components/ui/warm-page-container';
import { WarmCard } from '@/components/ui/warm-card';
import { AppearanceSection } from '@/components/profile/AppearanceSection';

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
  phone: string | null;
}

const ROLE_AGENCE_LABELS: Record<string, string> = {
  'dirigeant': 'Dirigeant(e)',
  'administratif': 'Administratif',
  'commercial': 'Commercial',
  'technicien': 'Technicien',
  'tete_de_reseau': 'Tête de réseau',
  'externe': 'Externe',
};

export default function Profile() {
  const { user, isAuthenticated } = useAuthCore();
  const { globalRole, enabledModules: rawEnabledModules } = usePermissions();
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
        .select('id, email, first_name, last_name, agence, role_agence, avatar_url, global_role, phone')
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

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('category-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Photo de profil mise à jour');
      
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
      
      invalidateAllUserQueries(queryClient);
    } catch (error) {
      logError('PROFILE', 'Error saving profile:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  const getEnabledModulesList = (): string[] => {
    if (!rawEnabledModules) return [];
    return Object.entries(rawEnabledModules)
      .filter(([, value]) => {
        if (!value) return false;
        return typeof value === 'boolean' ? value : (value as any).enabled === true;
      })
      .map(([key]) => {
        const def = MODULE_DEFINITIONS.find(m => m.key === key);
        return def?.label || key;
      });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <WarmPageContainer maxWidth="4xl" className="min-h-screen">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </WarmPageContainer>
    );
  }

  const effectiveRole = profile?.global_role || globalRole;
  const enabledModules = getEnabledModulesList();

  return (
    <WarmPageContainer maxWidth="4xl">
      <div className="space-y-8">
        
        {/* ====================== SECTION MON PROFIL ====================== */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warm-blue/80 to-warm-teal/60 flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Mon profil</h2>
              <p className="text-sm text-muted-foreground">Vos informations personnelles et paramètres de compte</p>
            </div>
          </div>

          {/* Header avec Avatar */}
          <WarmCard variant="gradient" accentColor="blue" padding="spacious" className="border-2 border-warm-blue/20">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-warm-blue/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-warm-lg">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-warm-blue" />
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
                <h1 className="text-2xl font-bold text-foreground">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Mon Profil'
                  }
                </h1>
                <p className="text-muted-foreground">
                  {profile?.email || 'Pas d\'email'}
                </p>
                {effectiveRole && (
                  <Badge className={`mt-2 ${VISIBLE_ROLE_COLORS[effectiveRole] || ''}`}>
                    {VISIBLE_ROLE_LABELS[effectiveRole]}
                  </Badge>
                )}
              </div>
            </div>
          </WarmCard>

          {/* Informations modifiables */}
          <WarmCard 
            icon={User} 
            title="Mes informations personnelles"
            description="Vous pouvez modifier ces informations"
            accentColor="blue"
            className="border-2 border-warm-blue/10"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom *</Label>
                  <Input
                    value={editableData.first_name}
                    onChange={(e) => setEditableData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Votre prénom"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={editableData.last_name}
                    onChange={(e) => setEditableData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Votre nom"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Téléphone</Label>
                  <Input
                    type="tel"
                    value={editableData.phone}
                    onChange={(e) => setEditableData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Votre numéro de téléphone"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={isSaving || !editableData.first_name.trim() || !editableData.last_name.trim()}
                className="w-full rounded-xl bg-warm-blue hover:bg-warm-blue/90"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enregistrer mes informations
              </Button>
            </div>
          </WarmCard>

          {/* Informations compte (lecture seule) */}
          <WarmCard 
            icon={Shield} 
            title="Sécurité et accès"
            description="Ces informations sont gérées par votre administrateur"
            accentColor="purple"
            className="border-2 border-warm-purple/10"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted cursor-not-allowed rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    Poste occupé
                  </Label>
                  <Input
                    value={ROLE_AGENCE_LABELS[profile?.role_agence || ''] || profile?.role_agence || ''}
                    disabled
                    className="bg-muted cursor-not-allowed rounded-xl"
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
                      <Badge key={mod} variant="secondary" className="rounded-lg">
                        {mod}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Aucun module spécifique</span>
                  )}
                </div>
              </div>
            </div>
          </WarmCard>
        </section>

        {/* ====================== SECTION APPARENCE ====================== */}
        <AppearanceSection />

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl"
          >
            Retour
          </Button>
        </div>

      </div>
    </WarmPageContainer>
  );
}
