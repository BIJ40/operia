import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserCheck, Plus, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMaintenanceAdmin } from '@/hooks/useMaintenanceMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UserInfo {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export function MaintenanceModeCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useMaintenanceAdmin();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [whitelistedUsers, setWhitelistedUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Sync message from settings
  useEffect(() => {
    if (settings?.message) {
      setMessage(settings.message);
    }
  }, [settings?.message]);

  // Load whitelisted users info
  useEffect(() => {
    const loadUsers = async () => {
      if (!settings?.whitelisted_user_ids?.length) {
        setWhitelistedUsers([]);
        return;
      }
      
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', settings.whitelisted_user_ids);
      
      if (!error && data) {
        setWhitelistedUsers(data);
      }
      setLoadingUsers(false);
    };
    
    loadUsers();
  }, [settings?.whitelisted_user_ids]);

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      // Si on active, s'assurer que l'utilisateur courant est dans la whitelist
      let userIds = settings?.whitelisted_user_ids ?? [];
      if (enabled && user?.id && !userIds.includes(user.id)) {
        userIds = [...userIds, user.id];
      }
      
      await updateSettings({ 
        is_enabled: enabled,
        whitelisted_user_ids: userIds 
      });
      toast.success(enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleSaveMessage = async () => {
    try {
      await updateSettings({ message });
      toast.success('Message mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAddUser = async () => {
    if (!newUserId.trim()) return;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newUserId.trim())) {
      toast.error('Format UUID invalide');
      return;
    }

    const currentIds = settings?.whitelisted_user_ids ?? [];
    if (currentIds.includes(newUserId.trim())) {
      toast.error('Utilisateur déjà dans la liste');
      return;
    }

    try {
      await updateSettings({ 
        whitelisted_user_ids: [...currentIds, newUserId.trim()] 
      });
      setNewUserId('');
      toast.success('Utilisateur ajouté à la whitelist');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const currentIds = settings?.whitelisted_user_ids ?? [];
    try {
      await updateSettings({ 
        whitelisted_user_ids: currentIds.filter(id => id !== userId) 
      });
      toast.success('Utilisateur retiré de la whitelist');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={settings?.is_enabled ? 'border-amber-500/50 bg-amber-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.is_enabled ? (
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-lg">Mode Maintenance</CardTitle>
              <CardDescription>
                Bloquer l'accès à tous les utilisateurs sauf ceux autorisés
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={settings?.is_enabled ?? false}
            onCheckedChange={handleToggleMaintenance}
            disabled={isUpdating}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Message personnalisé */}
        <div className="space-y-2">
          <Label>Message affiché aux utilisateurs bloqués</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="La plateforme est en cours d'amélioration..."
            rows={3}
          />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSaveMessage}
            disabled={isUpdating || message === settings?.message}
          >
            Sauvegarder le message
          </Button>
        </div>

        {/* Whitelist */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-green-500" />
            <Label>Utilisateurs autorisés (whitelist)</Label>
          </div>
          
          {/* Add user form */}
          <div className="flex gap-2">
            <Input
              placeholder="UUID de l'utilisateur"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="font-mono text-sm"
            />
            <Button 
              size="sm" 
              onClick={handleAddUser}
              disabled={isUpdating || !newUserId.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Whitelisted users list */}
          <div className="space-y-2">
            {loadingUsers ? (
              <div className="text-sm text-muted-foreground">Chargement...</div>
            ) : whitelistedUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Aucun utilisateur dans la whitelist
              </div>
            ) : (
              whitelistedUsers.map((u) => (
                <div 
                  key={u.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {u.first_name} {u.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {u.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.id === user?.id && (
                      <Badge variant="secondary" className="text-xs">Vous</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(u.id)}
                      disabled={isUpdating}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        {settings?.is_enabled && (
          <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
            <strong>Mode maintenance actif :</strong> Seuls les utilisateurs dans la whitelist peuvent accéder à l'application.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
