import { usePermissionsV2 } from '@/contexts/PermissionsContextV2';
import { AccessLevel, PermissionSource } from '@/types/permissions-v2';

export interface ModuleStateV2 {
  isGranted: boolean;
  accessLevel: AccessLevel;
  preconditionsOk: boolean;
  sourceLabel: string;
  source: PermissionSource | null;
  isReadOnly: boolean;
}

/**
 * Hook utilitaire pour connaître l'état complet d'un module pour l'utilisateur courant.
 * Utiliser pour les badges, tooltips, et logique conditionnelle UI.
 */
export function useModuleStateV2(moduleKey: string): ModuleStateV2 {
  const {
    hasModule,
    getAccessLevel,
    preconditionsOk,
    getSourceSummary,
    getSourceLabel,
  } = usePermissionsV2();

  const isGranted = hasModule(moduleKey);
  const accessLevel = getAccessLevel(moduleKey);
  const source = getSourceSummary(moduleKey);

  return {
    isGranted,
    accessLevel,
    preconditionsOk: preconditionsOk(moduleKey),
    sourceLabel: getSourceLabel(moduleKey),
    source,
    isReadOnly: isGranted && accessLevel === 'read',
  };
}
