/**
 * filterNavigationByPermissions — Centralized navigation filtering
 * 
 * Single source of truth for determining which navigation items are visible
 * based on the user's permissions (modules, options, and role).
 * 
 * Rules:
 *   visible = roleGuard OK AND moduleGuard OK AND enabledModules[key] === true
 * 
 * Exceptions:
 *   - Items with no guard (alwaysVisible) remain visible
 *   - Role-interface items (franchiseur, admin) use role checks only
 *   - Platform admins bypass all module checks
 */

import type { TabConfig, UnifiedTab } from '@/components/unified/workspace/types';
import type { ModuleKey } from '@/types/modules';

interface PermissionCheckers {
  hasModule: (key: ModuleKey) => boolean;
  hasModuleOption: (key: ModuleKey, option: string) => boolean;
  isPlatformAdmin: boolean;
}

/**
 * Determines if a top-level workspace tab should be VISIBLE (not just accessible).
 * A tab is hidden when it has a module guard and none of its required modules are enabled.
 */
export function isWorkspaceTabVisible(
  tab: TabConfig,
  perms: PermissionCheckers,
): boolean {
  // No guard = always visible (accueil, support)
  if (!tab.requiresOption) return true;

  // Platform admin bypass
  if (perms.isPlatformAdmin) return true;

  // Admin tab: role-only guard (handled separately by caller)
  if (tab.id === 'admin') return false; // non-admin never sees admin

  // Check primary module
  const { module, option } = tab.requiresOption;
  if (option) {
    if (perms.hasModuleOption(module as ModuleKey, option)) return true;
  } else {
    if (perms.hasModule(module as ModuleKey)) return true;
  }

  // Check alternative modules
  if (tab.altModules) {
    for (const altModule of tab.altModules) {
      if (perms.hasModule(altModule as ModuleKey)) return true;
    }
  }

  return false;
}

/**
 * Filters the full tab list, removing tabs the user cannot access.
 * Returns only visible tabs (not greyed-out — fully hidden).
 */
export function filterWorkspaceTabs(
  tabs: TabConfig[],
  perms: PermissionCheckers,
  /** Override for admin tab visibility (role-based) */
  isAdminVisible: boolean,
): TabConfig[] {
  return tabs.filter(tab => {
    if (tab.id === 'admin') return isAdminVisible;
    return isWorkspaceTabVisible(tab, perms);
  });
}

/**
 * Sub-tab filter — marks inaccessible tabs as disabled instead of hiding them.
 * Used by Pilotage, Commercial, Organisation, Support, etc.
 */
export function filterSubTabs<T extends { id: string; requiresModule?: ModuleKey; disabled?: boolean }>(
  tabs: T[],
  hasModule: (key: ModuleKey) => boolean,
): T[] {
  return tabs.map(tab => {
    if (!tab.requiresModule) return tab;
    return { ...tab, disabled: !hasModule(tab.requiresModule) };
  });
}

/**
 * Returns the first non-disabled tab id, or fallback.
 */
export function firstEnabledTabId<T extends { id: string; disabled?: boolean }>(
  tabs: T[],
  fallback: string,
): string {
  return tabs.find(t => !t.disabled)?.id ?? fallback;
}

/**
 * Returns true if the given tab id is enabled (not disabled) in the list.
 */
export function isTabEnabled<T extends { id: string; disabled?: boolean }>(
  tabs: T[],
  tabId: string,
): boolean {
  const tab = tabs.find(t => t.id === tabId);
  return tab ? !tab.disabled : false;
}
