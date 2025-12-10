/**
 * Dialog d'édition des permissions d'un utilisateur
 * Permet de modifier le rôle global, les modules et appliquer des templates
 * P2.3: Inclut l'historique des modifications
 */

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Crown, Layers, Wand2, Save, Loader2, ChevronRight, History } from 'lucide-react';
import { GlobalRole, GLOBAL_ROLE_LABELS, GLOBAL_ROLES } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey, EnabledModules, getDefaultModulesForRole, ModuleOptionsState } from '@/types/modules';
import { getUserManagementCapabilities } from '@/config/roleMatrix';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionAuditLog } from './PermissionAuditLog';

interface UserEditDialogProps {
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    global_role: GlobalRole | null;
    enabled_modules: Record<string, any> | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({ user, open, onOpenChange }: UserEditDialogProps) {
  const { user: currentUser, globalRole: currentUserRole } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedRole, setSelectedRole] = useState<GlobalRole | null>(null);
  const [modules, setModules] = useState<EnabledModules>({});
  const [activeTab, setActiveTab] = useState('role');
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  
  // Charger les données initiales de l'utilisateur (incluant user_modules)
  useEffect(() => {
    if (user && open) {
      setSelectedRole(user.global_role);
      setIsLoadingModules(true);
      
      // Charger depuis user_modules table
      supabase
        .from('user_modules')
        .select('module_key, options')
        .eq('user_id', user.id)
        .then(({ data: userModules, error }) => {
          if (error) {
            console.error('Erreur chargement user_modules:', error);
            // Fallback vers JSONB
            setModules((user.enabled_modules || {}) as EnabledModules);
          } else if (userModules && userModules.length > 0) {
            // Convertir user_modules en EnabledModules format
            const converted: EnabledModules = {};
            for (const row of userModules) {
              converted[row.module_key as ModuleKey] = {
                enabled: true,
                options: (row.options as Record<string, boolean>) || {},
              };
            }
            setModules(converted);
          } else {
            // Fallback vers JSONB si table vide
            setModules((user.enabled_modules || {}) as EnabledModules);
          }
          setIsLoadingModules(false);
        });
    }
  }, [user, open]);
  
  // Obtenir les rôles assignables
  const capabilities = getUserManagementCapabilities(currentUserRole);
  const assignableRoles = capabilities.canCreateRoles;
  
  // Vérifier si l'utilisateur courant peut éditer cet utilisateur
  const canEdit = user && (
    currentUserRole === 'superadmin' ||
    (user.global_role && assignableRoles.includes(user.global_role))
  );
  
  // Mutation pour sauvegarder (écriture dans user_modules + profiles.global_role)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Pas d\'utilisateur sélectionné');
      
      // 1. Mettre à jour le rôle global dans profiles
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ global_role: selectedRole })
        .eq('id', user.id);
        
      if (roleError) throw roleError;
      
      // 2. Supprimer les modules existants dans user_modules
      const { error: deleteError } = await supabase
        .from('user_modules')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) throw deleteError;
      
      // 3. Insérer les nouveaux modules
      const modulesToInsert = Object.entries(modules)
        .filter(([_, value]) => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'object' && value !== null) return (value as ModuleOptionsState).enabled;
          return false;
        })
        .map(([moduleKey, value]) => ({
          user_id: user.id,
          module_key: moduleKey,
          options: typeof value === 'object' && value !== null 
            ? (value as ModuleOptionsState).options || {}
            : {},
          enabled_by: currentUser?.id || null,
        }));
      
      if (modulesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_modules')
          .insert(modulesToInsert);
          
        if (insertError) throw insertError;
      }
      
      // 4. Mettre à jour aussi le JSONB pour compatibilité (durant migration)
      const modulesJson = JSON.parse(JSON.stringify(modules));
      await supabase
        .from('profiles')
        .update({ enabled_modules: modulesJson })
        .eq('id', user.id);
    },
    onSuccess: () => {
      toast.success('Permissions mises à jour');
      queryClient.invalidateQueries({ queryKey: ['permissions-center-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules', user?.id] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
  
  // Toggle un module
  const toggleModule = (moduleKey: ModuleKey, enabled: boolean) => {
    setModules(prev => ({
      ...prev,
      [moduleKey]: {
        enabled,
        options: (prev[moduleKey] as ModuleOptionsState)?.options || {},
      },
    }));
  };
  
  // Toggle une option de module
  const toggleModuleOption = (moduleKey: ModuleKey, optionKey: string, enabled: boolean) => {
    setModules(prev => {
      const moduleState = prev[moduleKey] as ModuleOptionsState | undefined;
      return {
        ...prev,
        [moduleKey]: {
          enabled: moduleState?.enabled ?? false,
          options: {
            ...moduleState?.options,
            [optionKey]: enabled,
          },
        },
      };
    });
  };
  
  // Appliquer le template du rôle sélectionné
  const applyRoleTemplate = () => {
    if (!selectedRole) return;
    const template = getDefaultModulesForRole(selectedRole);
    setModules(template);
    toast.success(`Template ${GLOBAL_ROLE_LABELS[selectedRole]} appliqué`);
  };
  
  // Helper: vérifier si un module est activé
  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') return (state as ModuleOptionsState).enabled;
    return false;
  };
  
  // Helper: vérifier si une option est activée
  const isOptionEnabled = (moduleKey: ModuleKey, optionKey: string): boolean => {
    const state = modules[moduleKey];
    if (typeof state === 'boolean') return state;
    if (typeof state === 'object') {
      return (state as ModuleOptionsState).options?.[optionKey] ?? false;
    }
    return false;
  };
  
  if (!user) return null;
  
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Éditer les permissions
          </DialogTitle>
          <DialogDescription>
            {userName} ({user.email})
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="role" className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rôle</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Template</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Onglet Rôle */}
          <TabsContent value="role" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Rôle global</Label>
              <Select 
                value={selectedRole || ''} 
                onValueChange={(v) => setSelectedRole(v as GlobalRole)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GLOBAL_ROLE_LABELS).map(([role, label]) => {
                    const canAssign = assignableRoles.includes(role as GlobalRole) || 
                      (currentUserRole === 'superadmin' && role !== 'superadmin');
                    return (
                      <SelectItem key={role} value={role} disabled={!canAssign}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            N{GLOBAL_ROLES[role as GlobalRole]}
                          </Badge>
                          {label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le rôle global détermine le niveau d'accès de base.
              </p>
            </div>
          </TabsContent>
          
          {/* Onglet Modules */}
          <TabsContent value="modules" className="mt-4 overflow-hidden">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {MODULE_DEFINITIONS.map((moduleDef) => {
                  const enabled = isModuleEnabled(moduleDef.key);
                  
                  return (
                    <div key={moduleDef.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(v) => toggleModule(moduleDef.key, v)}
                          />
                          <Label className="font-medium">{moduleDef.label}</Label>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Min: N{GLOBAL_ROLES[moduleDef.minRole]}
                        </Badge>
                      </div>
                      
                      {/* Options du module */}
                      {enabled && moduleDef.options.length > 0 && (
                        <div className="ml-6 pl-4 border-l space-y-2">
                          {moduleDef.options.map((opt) => (
                            <div key={opt.key} className="flex items-center gap-2">
                              <Switch
                                checked={isOptionEnabled(moduleDef.key, opt.key)}
                                onCheckedChange={(v) => toggleModuleOption(moduleDef.key, opt.key, v)}
                              />
                              <div className="flex-1">
                                <Label className="text-sm">{opt.label}</Label>
                                <p className="text-xs text-muted-foreground">{opt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Separator className="my-2" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Onglet Template */}
          <TabsContent value="template" className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              Appliquez un template prédéfini basé sur le rôle sélectionné. Cela remplacera la configuration actuelle des modules.
            </div>
            
            <div className="grid gap-2">
              {Object.entries(GLOBAL_ROLE_LABELS).map(([role, label]) => (
                <Button
                  key={role}
                  variant={role === selectedRole ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => {
                    setSelectedRole(role as GlobalRole);
                    const template = getDefaultModulesForRole(role as GlobalRole);
                    setModules(template);
                    toast.success(`Template ${label} appliqué`);
                  }}
                >
                  <Badge variant="outline" className="mr-2 font-mono">
                    N{GLOBAL_ROLES[role as GlobalRole]}
                  </Badge>
                  {label}
                  <ChevronRight className="ml-auto h-4 w-4" />
                </Button>
              ))}
            </div>
          </TabsContent>
          
          {/* Onglet Historique - P2.3 */}
          <TabsContent value="history" className="mt-4">
            {user && <PermissionAuditLog userId={user.id} />}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canEdit}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
