/**
 * ANTI-REGRESSION: Ticketing is overwrite-only
 * 
 * Le ticketing ne doit JAMAIS être activé par plan ou par rôle.
 * Il est activable uniquement via un overwrite utilisateur (user_modules).
 */

import { describe, it, expect } from 'vitest';
import { MODULE_DEFINITIONS, MODULES } from '@/types/modules';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { isModuleEnabled } from '@/permissions/permissionsEngine';
import { OVERWRITE_ONLY_MODULES, isOverwriteOnlyModule } from '@/permissions/moduleRegistry';
import { GlobalRole } from '@/types/globalRoles';

describe('Ticketing: overwrite-only module', () => {
  // ========================================
  // STRUCTURAL INVARIANTS
  // ========================================

  it('ticketing exists in MODULES', () => {
    expect(MODULES.ticketing).toBe('ticketing');
  });

  it('ticketing exists in MODULE_DEFINITIONS', () => {
    const def = MODULE_DEFINITIONS.find(m => m.key === 'ticketing');
    expect(def).toBeDefined();
  });

  it('ticketing is marked as overwriteOnly in MODULE_DEFINITIONS', () => {
    const def = MODULE_DEFINITIONS.find(m => m.key === 'ticketing');
    expect(def?.overwriteOnly).toBe(true);
  });

  it('ticketing has empty defaultForRoles', () => {
    const def = MODULE_DEFINITIONS.find(m => m.key === 'ticketing');
    expect(def?.defaultForRoles).toEqual([]);
  });

  it('ticketing is in OVERWRITE_ONLY_MODULES', () => {
    expect(OVERWRITE_ONLY_MODULES).toContain('ticketing');
    expect(isOverwriteOnlyModule('ticketing')).toBe(true);
  });

  // ========================================
  // NO DEFAULT ACTIVATION BY ROLE
  // ========================================

  const ALL_ROLES: GlobalRole[] = [
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
  ];

  it('ticketing is NOT in any DEFAULT_MODULES_BY_ROLE', () => {
    for (const role of ALL_ROLES) {
      const modules = DEFAULT_MODULES_BY_ROLE[role];
      if (modules) {
        expect(modules).not.toHaveProperty('ticketing');
      }
    }
  });

  // ========================================
  // RUNTIME BEHAVIOR
  // ========================================

  it('STARTER user → ticketing = false', () => {
    const result = isModuleEnabled({}, 'ticketing');
    expect(result).toBe(false);
  });

  it('PRO user → ticketing = false', () => {
    const result = isModuleEnabled({}, 'ticketing');
    expect(result).toBe(false);
  });

  it('null enabledModules → ticketing = false', () => {
    const result = isModuleEnabled(null, 'ticketing');
    expect(result).toBe(false);
  });

  it('user with overwrite → ticketing = true', () => {
    const result = isModuleEnabled(
      { ticketing: { enabled: true, options: { kanban: true } } },
      'ticketing'
    );
    expect(result).toBe(true);
  });

  it('superadmin with ticketing in enabledModules → ticketing = true', () => {
    const result = isModuleEnabled(
      { ticketing: { enabled: true, options: { kanban: true, manage: true, import: true } } },
      'ticketing'
    );
    expect(result).toBe(true);
  });
});
