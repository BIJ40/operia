import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, UserCheck, X, Loader2, Check, ChevronsUpDown, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMaintenanceAdmin } from '@/hooks/useMaintenanceMode';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { cn } from '@/lib/utils';

interface UserInfo {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface MaintenanceModeCardProps {
  compact?: boolean;
}

export function MaintenanceModeCard({ compact = false }: MaintenanceModeCardProps) {
  const { settings, isLoading, updateSettings, isUpdating } = useMaintenanceAdmin();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [whitelistedUsers, setWhitelistedUsers] = useState<UserInfo[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Sync message from settings
  useEffect(() => {
    if (settings?.message) {
      setMessage(settings.message);
    }
  }, [settings?.message]);

  // Load all users for the dropdown
  useEffect(() => {
    const loadAllUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');
      
      if (!error && data) {
        setAllUsers(data);
      }
    };
    loadAllUsers();
  }, []);

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

  const handleToggleUser = async (userId: string) => {
    const currentIds = settings?.whitelisted_user_ids ?? [];
    const isSelected = currentIds.includes(userId);
    
    try {
      if (isSelected) {
        await updateSettings({ 
          whitelisted_user_ids: currentIds.filter(id => id !== userId) 
        });
      } else {
        await updateSettings({ 
          whitelisted_user_ids: [...currentIds, userId] 
        });
      }
    } catch (error) {
      toast.error('Erreur lors de la modification');
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

  const getUserLabel = (u: UserInfo) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
    return name || u.email || u.id;
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        compact ? "p-3 rounded-lg border border-border/50 bg-card/50" : ""
      )}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact mode - simple inline toggle
  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        settings?.is_enabled 
          ? "border-amber-500/50 bg-amber-500/5" 
          : "border-border/50 bg-card/50"
      )}>
        <div className="flex items-center gap-3">
          {settings?.is_enabled ? (
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          ) : (
            <Shield className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <span className="font-medium text-sm">Mode Maintenance</span>
            {settings?.is_enabled && (
              <Badge variant="destructive" className="ml-2 text-xs">ACTIF</Badge>
            )}
          </div>
        </div>
        <Switch
          checked={settings?.is_enabled ?? false}
          onCheckedChange={handleToggleMaintenance}
          disabled={isUpdating}
        />
      </div>
    );
  }

  return (
    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
      <Card className={settings?.is_enabled ? 'border-amber-500/50 bg-amber-500/5' : ''}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
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
              <div className="flex items-center gap-3">
                {settings?.is_enabled && (
                  <Badge variant="destructive" className="text-xs">ACTIF</Badge>
                )}
                <Switch
                  checked={settings?.is_enabled ?? false}
                  onCheckedChange={handleToggleMaintenance}
                  disabled={isUpdating}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  !isCollapsed && "rotate-180"
                )} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
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
              
              {/* Multi-select user dropdown */}
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={isUpdating}
                  >
                    <span className="truncate">
                      {whitelistedUsers.length > 0 
                        ? `${whitelistedUsers.length} utilisateur(s) sélectionné(s)`
                        : "Sélectionner des utilisateurs..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover border z-50" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un utilisateur..." />
                    <CommandList>
                      <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {allUsers.map((u) => {
                          const isSelected = settings?.whitelisted_user_ids?.includes(u.id) ?? false;
                          return (
                            <CommandItem
                              key={u.id}
                              value={`${u.first_name} ${u.last_name} ${u.email}`}
                              onSelect={() => handleToggleUser(u.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{getUserLabel(u)}</span>
                                <span className="text-xs text-muted-foreground">{u.email}</span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
