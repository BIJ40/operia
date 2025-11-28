import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Key, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserPermissionOverride {
  id: string;
  scope_id: string;
  level: number | null;
  deny: boolean | null;
}

interface Scope {
  id: string;
  slug: string;
  label: string;
  area: string;
  default_level: number | null;
}

interface UserPermissionsSectionProps {
  userId: string;
  userRole: string | null;
}

export function UserPermissionsSection({ userId, userRole }: UserPermissionsSectionProps) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([]);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les scopes actifs
      const { data: scopesData } = await supabase
        .from('scopes')
        .select('id, slug, label, area, default_level')
        .eq('is_active', true)
        .order('display_order');

      setScopes((scopesData as Scope[]) || []);

      // Charger les overrides utilisateur
      const { data: overridesData } = await supabase
        .from('user_permissions')
        .select('id, scope_id, level, deny')
        .eq('user_id', userId)
        .not('scope_id', 'is', null);

      setOverrides((overridesData as UserPermissionOverride[]) || []);
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (scope: Scope) => {
    try {
      const existingOverride = overrides.find(o => o.scope_id === scope.id);
      
      if (existingOverride) {
        // Toggle: si deny ou level=0, donner level=1 (lecture), sinon deny
        if (existingOverride.deny || (existingOverride.level !== null && existingOverride.level === 0)) {
          // Donner accès lecture
          await supabase
            .from('user_permissions')
            .update({ level: 1, deny: false })
            .eq('id', existingOverride.id);
        } else {
          // Bloquer
          await supabase
            .from('user_permissions')
            .update({ level: 0, deny: true })
            .eq('id', existingOverride.id);
        }
      } else {
        // Créer un override qui bloque (inverse du défaut)
        const defaultHasAccess = (scope.default_level ?? 0) > 0;
        await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            scope_id: scope.id,
            level: defaultHasAccess ? 0 : 1,
            deny: defaultHasAccess,
          });
      }

      await loadData();
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
        .eq('user_id', userId)
        .not('scope_id', 'is', null);

      setOverrides([]);
      toast({
        title: 'Permissions réinitialisées',
        description: 'Les permissions sont revenues aux valeurs par défaut',
      });
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
    }
  };

  const getPermissionStatus = (scope: Scope) => {
    const override = overrides.find(o => o.scope_id === scope.id);
    if (override) {
      const hasAccess = !override.deny && (override.level ?? 0) > 0;
      return { value: hasAccess, isCustom: true, isDenied: override.deny };
    }
    // Par défaut du scope
    const defaultHasAccess = (scope.default_level ?? 0) > 0;
    return { value: defaultHasAccess, isCustom: false, isDenied: false };
  };

  const hasCustomPermissions = overrides.length > 0;

  // Grouper les scopes par area pour un affichage organisé
  const scopesByArea = scopes.reduce((acc, scope) => {
    if (!acc[scope.area]) acc[scope.area] = [];
    acc[scope.area].push(scope);
    return acc;
  }, {} as Record<string, Scope[]>);

  const areaLabels: Record<string, string> = {
    'help_academy': 'HELP Academy',
    'pilotage_agence': 'Pilotage Agence',
    'support': 'Support',
    'pilotage_franchiseur': 'Réseau Franchiseur',
    'administration': 'Administration',
  };

  return (
    <Collapsible className="border rounded-lg border-amber-200 bg-amber-50/30">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-amber-50/50">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-500" />
          <span className="font-medium">Permissions individuelles</span>
          {hasCustomPermissions && (
            <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
              {overrides.length} surcharge{overrides.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Surcharges par rapport aux permissions du groupe/rôle
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
            Réinitialiser aux valeurs par défaut
          </Button>
        )}

        <div className="space-y-4">
          {Object.entries(scopesByArea).map(([area, areaScopes]) => (
            <div key={area} className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {areaLabels[area] || area}
              </h4>
              <div className="space-y-2">
                {areaScopes.map((scope) => {
                  const status = getPermissionStatus(scope);
                  return (
                    <div
                      key={scope.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        status.isDenied ? 'bg-red-50 border-red-200' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{scope.label}</span>
                          {status.isCustom && (
                            <Badge 
                              variant={status.isDenied ? "destructive" : "secondary"} 
                              className="text-xs"
                            >
                              {status.isDenied ? 'Bloqué' : 'Personnalisé'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={status.value}
                        onCheckedChange={() => handleTogglePermission(scope)}
                        disabled={loading}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
