import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Key, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPermission {
  block_id: string;
  can_access: boolean;
}

interface UserPermissionsSectionProps {
  userId: string;
  userRole: string | null;
}

const AVAILABLE_PERMISSIONS = [
  { scope: 'apogee', label: 'Guide Apogée', description: 'Accès au guide Apogée' },
  { scope: 'apporteurs', label: 'Guide Apporteurs', description: 'Accès au guide Apporteurs' },
  { scope: 'helpconfort', label: 'Guide HelpConfort', description: 'Accès au guide HelpConfort' },
  { scope: 'mes_indicateurs', label: 'Mes Indicateurs', description: 'Accès aux KPIs et statistiques' },
];

export function UserPermissionsSection({ userId, userRole }: UserPermissionsSectionProps) {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPermissions();
    }
  }, [userId, userRole]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Charger les permissions individuelles
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('block_id, can_access')
        .eq('user_id', userId);

      setPermissions(userPerms || []);

      // Charger les permissions du rôle
      if (userRole) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('block_id, can_access')
          .eq('role_agence', userRole);

        const rolePermsMap: Record<string, boolean> = {};
        rolePerms?.forEach(p => {
          rolePermsMap[p.block_id] = p.can_access;
        });
        setRolePermissions(rolePermsMap);
      }
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (scope: string, currentValue: boolean | null) => {
    try {
      const existingPerm = permissions.find(p => p.block_id === scope);
      
      if (existingPerm) {
        // Mettre à jour
        await supabase
          .from('user_permissions')
          .update({ can_access: !existingPerm.can_access })
          .eq('user_id', userId)
          .eq('block_id', scope);
      } else {
        // Créer
        const roleDefault = rolePermissions[scope] ?? true;
        await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            block_id: scope,
            can_access: !roleDefault,
          });
      }

      await loadPermissions();
    } catch (error) {
      console.error('Erreur modification permission:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la permission',
        variant: 'destructive',
      });
    }
  };

  const handleResetPermissions = async () => {
    try {
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      setPermissions([]);
      toast({
        title: 'Permissions réinitialisées',
        description: 'Les permissions sont revenues aux valeurs par défaut du rôle',
      });
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
    }
  };

  const getPermissionStatus = (scope: string) => {
    const userPerm = permissions.find(p => p.block_id === scope);
    if (userPerm) {
      return { value: userPerm.can_access, isCustom: true };
    }
    const rolePerm = rolePermissions[scope];
    return { value: rolePerm ?? true, isCustom: false };
  };

  const hasCustomPermissions = permissions.length > 0;

  return (
    <Collapsible className="border rounded-lg border-amber-200 bg-amber-50/30">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-amber-50/50">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-500" />
          <span className="font-medium">Permissions individuelles</span>
          {hasCustomPermissions && (
            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
              {permissions.length} surcharge{permissions.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Surcharges par rapport aux permissions du rôle "{userRole || 'aucun'}"
        </p>

        {hasCustomPermissions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetPermissions}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser aux valeurs du rôle
          </Button>
        )}

        <div className="space-y-3">
          {AVAILABLE_PERMISSIONS.map((perm) => {
            const status = getPermissionStatus(perm.scope);
            return (
              <div
                key={perm.scope}
                className="flex items-center justify-between p-2 rounded border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{perm.label}</span>
                    {status.isCustom && (
                      <Badge variant="secondary" className="text-xs">
                        Personnalisé
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
                <Switch
                  checked={status.value}
                  onCheckedChange={() => handleTogglePermission(perm.scope, status.value)}
                  disabled={loading}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
