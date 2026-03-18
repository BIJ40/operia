/**
 * TeamMemberModules — Toggles de modules pour un N1 individuel
 * 
 * Affiche la liste des modules assignables, avec switch on/off.
 * Le N2 ne peut attribuer que les modules qu'il possède lui-même.
 * Bouton "Réinitialiser au preset" pour remettre les defaults du poste.
 */

import { useMemo } from 'react';
import { useUserModules, useToggleModule } from '@/hooks/useUserModules';
import { N2_ASSIGNABLE_MODULES, getPresetForRole } from '@/config/roleAgenceModulePresets';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { ModuleKey } from '@/types/modules';
import { toast } from 'sonner';
import { deleteAllUserModules, bulkInsertUserModules } from '@/repositories/userModulesRepository';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthCore } from '@/contexts/AuthCoreContext';

interface Props {
  userId: string;
  roleAgence: string | null;
  n2HasModule: (key: ModuleKey) => boolean;
  isDeployedModule: (key: ModuleKey) => boolean;
}

export function TeamMemberModules({ userId, roleAgence, n2HasModule }: Props) {
  const { data: userModules, isLoading } = useUserModules(userId);
  const toggleModule = useToggleModule();
  const queryClient = useQueryClient();
  const { user } = useAuthCore();
  const { getShortLabel } = useModuleLabels();

  // Only show modules that the N2 has access to
  const assignableModules = useMemo(() => {
    return N2_ASSIGNABLE_MODULES.filter(m => n2HasModule(m.key));
  }, [n2HasModule]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof assignableModules>();
    for (const mod of assignableModules) {
      const list = map.get(mod.category) ?? [];
      list.push(mod);
      map.set(mod.category, list);
    }
    return map;
  }, [assignableModules]);

  const isModuleEnabled = (key: ModuleKey): boolean => {
    if (!userModules) return false;
    const state = userModules[key];
    if (typeof state === 'boolean') return state;
    return state?.enabled ?? false;
  };

  const handleToggle = (key: ModuleKey, enabled: boolean) => {
    toggleModule.mutate({ userId, moduleKey: key, enabled });
  };

  const handleResetToPreset = async () => {
    if (!roleAgence) return;
    const preset = getPresetForRole(roleAgence);
    
    try {
      await deleteAllUserModules(userId);
      if (preset.length > 0) {
        await bulkInsertUserModules(
          preset.map(key => ({
            user_id: userId,
            module_key: key,
            options: null,
            enabled_at: new Date().toISOString(),
            enabled_by: user?.id || null,
          }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['user-modules', userId] });
      toast.success('Droits réinitialisés au profil par défaut');
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement des droits…</span>
      </div>
    );
  }

  if (assignableModules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucun module assignable disponible.
      </p>
    );
  }

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      {[...grouped.entries()].map(([category, modules]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {category}
          </h4>
          <div className="space-y-2">
            {modules.map(mod => (
              <div
                key={mod.key}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm">{getShortLabel(mod.key, mod.fallbackLabel)}</span>
                <Switch
                  checked={isModuleEnabled(mod.key)}
                  onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                  disabled={toggleModule.isPending}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {roleAgence && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={handleResetToPreset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Réinitialiser au profil « {roleAgence} »
        </Button>
      )}
    </div>
  );
}
