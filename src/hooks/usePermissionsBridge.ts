/**
 * usePermissionsBridge — Hook de transition V1 → V2
 *
 * Retourne exactement la même interface que usePermissions() V1.
 * Selon USE_PERMISSIONS_V2, délègue soit au contexte V1 soit au contexte V2.
 *
 * Les 67 fichiers consommateurs remplacent :
 *   const { hasModule, isAdmin, ... } = usePermissions();
 * par :
 *   const { hasModule, isAdmin, ... } = usePermissionsBridge();
 *
 * Aucune autre modification nécessaire dans ces fichiers.
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionsV2 } from '@/contexts/PermissionsContextV2';
import { useAppFeatureFlag } from '@/hooks/useAppFeatureFlag';
import { PermissionEntry } from '@/types/permissions-v2';

// Interface identique à PermissionsContextType V1
// pour garantir la compatibilité avec les 67 consommateurs
interface PermissionsBridgeResult {
  // Fonctions
  hasGlobalRole: (requiredRole: string) => boolean;
  hasModule: (moduleKey: string) => boolean;
  hasModuleOption: (moduleKey: string, optionKey: string) => boolean;
  hasAccessToScope: (scope: string) => boolean;
  isDeployedModule: (moduleKey: string) => boolean;

  // Données brutes
  globalRole: string | null;

  // Flags dérivés
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;

  // Flags support
  canAccessSupportUser: boolean;
  hasSupportAgentRole: boolean;
  isSupportAdmin: boolean;
  canManageTickets: boolean;

  // Flags FAQ
  hasFaqAdminRole: boolean;
  canAccessFaqAdmin: boolean;
}

export function usePermissionsBridge(): PermissionsBridgeResult {
  const useV2 = useAppFeatureFlag('USE_PERMISSIONS_V2');

  // Toujours appeler les deux hooks — les règles des hooks l'exigent
  // Le contexte V2 peut ne pas être disponible si le flag est false
  // On gère ça via try/catch dans le hook V2
  const v1 = usePermissions();
  const v2Available = useV2 ? (() => {
    try {
      return usePermissionsV2();
    } catch {
      return null;
    }
  })() : null;

  // Si V2 non disponible ou flag désactivé — retourner V1 directement
  if (!useV2 || !v2Available) {
    return {
      hasGlobalRole:        v1.hasGlobalRole,
      hasModule:            v1.hasModule,
      hasModuleOption:      v1.hasModuleOption,
      hasAccessToScope:     v1.hasAccessToScope,
      isDeployedModule:     v1.isDeployedModule,
      globalRole:           v1.globalRole,
      isAdmin:              v1.isAdmin,
      isSupport:            v1.isSupport,
      isFranchiseur:        v1.isFranchiseur,
      canAccessSupportUser: v1.canAccessSupportUser,
      hasSupportAgentRole:  v1.hasSupportAgentRole,
      isSupportAdmin:       v1.isSupportAdmin,
      canManageTickets:     v1.canManageTickets,
      hasFaqAdminRole:      v1.hasFaqAdminRole,
      canAccessFaqAdmin:    v1.canAccessFaqAdmin,
    };
  }

  // V2 actif — construire l'interface V1 depuis les données V2
  const entries: PermissionEntry[] = v2Available.entries;

  // Map pour accès O(1)
  const entryMap = new Map<string, PermissionEntry>();
  for (const entry of entries) {
    entryMap.set(entry.module_key, entry);
  }

  // Dériver globalRole depuis les entries V2
  // bypass = N5+, sinon lire depuis V1 (V1 reste chargé en parallèle)
  const hasBypass = entries.some(e => e.source_summary === 'bypass');
  const globalRole = v1.globalRole; // V1 reste la source pour globalRole

  // isAdmin : N5+ (platform_admin ou superadmin)
  const isAdmin = hasBypass;

  // isFranchiseur : N3+ — utiliser V1 comme source de vérité pour le rôle
  const isFranchiseur = (() => {
    const role = v1.globalRole;
    return role === 'franchisor_user' ||
           role === 'franchisor_admin' ||
           role === 'platform_admin' ||
           role === 'superadmin';
  })();

  // isSupport : accès à support.aide_en_ligne
  const supportEntry = entryMap.get('support.aide_en_ligne');
  const isSupport = supportEntry?.granted === true;

  return {
    // hasModule V2 : granted=true ET access_level != 'none'
    hasModule: (moduleKey: string) => {
      const entry = entryMap.get(moduleKey);
      if (!entry) return false;
      return entry.granted && entry.access_level !== 'none';
    },

    hasModuleOption: (moduleKey: string, optionKey: string) => {
      const entry = entryMap.get(moduleKey);
      if (!entry || !entry.granted) return false;
      return entry.options?.[optionKey] === true;
    },

    // isDeployedModule V2 : le module est dans les entries (déployé)
    // qu'il soit accordé ou non (not_granted = déployé mais non accordé)
    isDeployedModule: (moduleKey: string) => {
      return entryMap.has(moduleKey);
    },

    // hasGlobalRole : déléguer à V1 — le rôle global n'est pas dans V2
    hasGlobalRole: v1.hasGlobalRole,

    // hasAccessToScope : déléguer à V1 — hors scope V2
    hasAccessToScope: v1.hasAccessToScope,

    globalRole,
    isAdmin,
    isSupport,
    isFranchiseur,

    // Flags support : déléguer à V1
    canAccessSupportUser: v1.canAccessSupportUser,
    hasSupportAgentRole:  v1.hasSupportAgentRole,
    isSupportAdmin:       v1.isSupportAdmin,
    canManageTickets:     v1.canManageTickets,

    // Flags FAQ : déléguer à V1
    hasFaqAdminRole:   v1.hasFaqAdminRole,
    canAccessFaqAdmin: v1.canAccessFaqAdmin,
  };
}
