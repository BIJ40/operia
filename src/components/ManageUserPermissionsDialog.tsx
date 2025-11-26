import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, Lock, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface ManageUserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string | null;
}

interface Permission {
  scope: string;
  label: string;
  description: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { scope: 'apogee', label: 'Apogée', description: 'Accès au guide Apogée' },
  { scope: 'apporteurs', label: 'Apporteurs', description: 'Accès au guide Apporteurs' },
  { scope: 'helpconfort', label: 'HelpConfort', description: 'Accès au guide HelpConfort' },
  { scope: 'mes_indicateurs', label: 'Mes Indicateurs', description: 'Accès aux statistiques et KPIs' },
];

export function ManageUserPermissionsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userRole,
}: ManageUserPermissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  useEffect(() => {
    if (open && userId) {
      loadPermissions();
    }
  }, [open, userId]);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // Charger les permissions individuelles
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('block_id, can_access')
        .eq('user_id', userId);

      const userPermsMap: Record<string, boolean> = {};
      userPerms?.forEach(p => {
        userPermsMap[p.block_id] = p.can_access;
      });
      setUserPermissions(userPermsMap);

      // Charger les permissions du rôle
      if (userRole) {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('block_id, can_access')
          .eq('role_agence', userRole)
          .eq('can_access', true);

        setRolePermissions(rolePerms?.map(p => p.block_id) || []);
      } else {
        setRolePermissions([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      toast.error("Erreur lors du chargement des permissions");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (scope: string, currentValue: boolean | undefined) => {
    try {
      const newValue = !currentValue;

      // Si la permission existe déjà, la mettre à jour
      const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('block_id', scope)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_permissions')
          .update({ can_access: newValue })
          .eq('id', existing.id);
      } else {
        // Sinon, créer une nouvelle permission
        await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            block_id: scope,
            can_access: newValue,
          });
      }

      setUserPermissions(prev => ({
        ...prev,
        [scope]: newValue,
      }));

      toast.success("Permission mise à jour");
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleResetPermissions = async () => {
    setResetting(true);
    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUserPermissions({});
      toast.success("Permissions réinitialisées", {
        description: "L'utilisateur utilise maintenant les permissions de son rôle",
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error("Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
    }
  };

  const getPermissionStatus = (scope: string): 'individual' | 'role' | 'none' => {
    if (scope in userPermissions) {
      return 'individual';
    }
    if (rolePermissions.includes(scope)) {
      return 'role';
    }
    return 'none';
  };

  const hasIndividualPermissions = Object.keys(userPermissions).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Permissions individuelles</DialogTitle>
          <DialogDescription>
            Gérer les permissions spécifiques pour <strong>{userName}</strong>
            {userRole && <span className="block mt-1 text-xs">Rôle: {userRole}</span>}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {hasIndividualPermissions && (
              <Card className="p-4 bg-accent/10 border-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">
                      Permissions personnalisées actives
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPermissions}
                    disabled={resetting}
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Réinitialiser
                  </Button>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const status = getPermissionStatus(perm.scope);
                const isChecked = status === 'individual' 
                  ? userPermissions[perm.scope] 
                  : status === 'role';
                const isOverridden = status === 'individual';

                return (
                  <Card key={perm.scope} className={`p-4 ${isOverridden ? 'border-accent' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={perm.scope} className="font-medium cursor-pointer">
                            {perm.label}
                          </Label>
                          {isOverridden && (
                            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                              Personnalisé
                            </span>
                          )}
                          {!isOverridden && status === 'role' && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Par rôle
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {perm.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <Unlock className="h-4 w-4 text-green-600" />
                        ) : (
                          <Lock className="h-4 w-4 text-destructive" />
                        )}
                        <Switch
                          id={perm.scope}
                          checked={isChecked}
                          onCheckedChange={() => handleTogglePermission(perm.scope, userPermissions[perm.scope])}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
              <p className="font-semibold mb-1">💡 Comment ça fonctionne ?</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Permissions personnalisées</strong> : Remplacent les permissions du rôle</li>
                <li><strong>Par rôle</strong> : Héritées du rôle ({userRole || 'aucun'})</li>
                <li><strong>Réinitialiser</strong> : Supprime toutes les permissions personnalisées</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
