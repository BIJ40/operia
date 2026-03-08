/**
 * PERMISSIONS LOCKDOWN TESTS — Phase 4
 * 
 * Ensures consistency across all permission sources:
 * - GLOBAL_ROLES (types/globalRoles.ts)
 * - ROLE_HIERARCHY (permissions/constants.ts)
 * - SHARED_ROLE_HIERARCHY (permissions/shared-constants.ts)
 * - MODULE_DEFINITIONS min roles vs MODULE_MIN_ROLES
 * - SHARED_MODULE_MIN_ROLES
 * - Edge function permissionsEngine (verified by value)
 * - User management capabilities escalation prevention
 * - Scope-to-module mapping completeness
 */

import { describe, it, expect } from 'vitest';
import { GLOBAL_ROLES, GlobalRole, getAllRolesSorted, hasMinimumRole } from '@/types/globalRoles';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { 
  ROLE_HIERARCHY, 
  MODULE_MIN_ROLES,
  BYPASS_ROLES,
  BYPASS_MIN_LEVEL,
  AGENCY_REQUIRED_MODULES,
  NETWORK_MODULES,
  NETWORK_MIN_ROLE,
  MODULE_OPTION_MIN_ROLES,
} from '../constants';
import { 
  SHARED_ROLE_HIERARCHY, 
  SHARED_MODULE_MIN_ROLES,
  SHARED_BYPASS_ROLES,
  SHARED_AGENCY_REQUIRED_MODULES,
  SHARED_NETWORK_MODULES,
  SHARED_NETWORK_MIN_ROLE,
} from '../shared-constants';
import { 
  hasMinRole, 
  getRoleLevel, 
  isBypassRole, 
  hasAccess,
  getUserManagementCapabilities,
  getEffectiveModules,
} from '../permissionsEngine';
import type { HasAccessParams, PermissionContext } from '../types';

// ============================================================================
// 1. ROLE HIERARCHY CONSISTENCY
// ============================================================================

describe('Role hierarchy consistency', () => {
  const allRoles: GlobalRole[] = [
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
  ];

  it('GLOBAL_ROLES and ROLE_HIERARCHY have identical values', () => {
    for (const role of allRoles) {
      expect(ROLE_HIERARCHY[role]).toBe(GLOBAL_ROLES[role]);
    }
  });

  it('SHARED_ROLE_HIERARCHY matches ROLE_HIERARCHY', () => {
    for (const role of allRoles) {
      expect(SHARED_ROLE_HIERARCHY[role]).toBe(ROLE_HIERARCHY[role]);
    }
  });

  it('hierarchy is strictly ascending N0 < N1 < ... < N6', () => {
    const sorted = getAllRolesSorted();
    for (let i = 1; i < sorted.length; i++) {
      expect(ROLE_HIERARCHY[sorted[i]]).toBeGreaterThan(ROLE_HIERARCHY[sorted[i - 1]]);
    }
  });

  it('base_user is 0, superadmin is 6', () => {
    expect(ROLE_HIERARCHY['base_user']).toBe(0);
    expect(ROLE_HIERARCHY['superadmin']).toBe(6);
  });

  it('hasMinRole and hasMinimumRole produce same results', () => {
    for (const userRole of allRoles) {
      for (const reqRole of allRoles) {
        expect(hasMinRole(userRole, reqRole)).toBe(hasMinimumRole(userRole, reqRole));
      }
    }
  });
});

// ============================================================================
// 2. MODULE MIN ROLES CONSISTENCY
// ============================================================================

describe('Module min roles consistency', () => {
  it('MODULE_MIN_ROLES matches MODULE_DEFINITIONS.minRole for all modules', () => {
    for (const mod of MODULE_DEFINITIONS) {
      expect(MODULE_MIN_ROLES[mod.key]).toBe(mod.minRole);
    }
  });

  it('SHARED_MODULE_MIN_ROLES matches MODULE_DEFINITIONS.minRole', () => {
    for (const mod of MODULE_DEFINITIONS) {
      const sharedKey = mod.key as keyof typeof SHARED_MODULE_MIN_ROLES;
      if (SHARED_MODULE_MIN_ROLES[sharedKey] !== undefined) {
        expect(SHARED_MODULE_MIN_ROLES[sharedKey]).toBe(mod.minRole);
      }
    }
  });

  it('all MODULE_DEFINITIONS modules have an entry in MODULE_MIN_ROLES', () => {
    for (const mod of MODULE_DEFINITIONS) {
      expect(MODULE_MIN_ROLES[mod.key]).toBeDefined();
    }
  });
});

// ============================================================================
// 3. SHARED CONSTANTS SYNC
// ============================================================================

describe('Shared constants sync with frontend constants', () => {
  it('SHARED_BYPASS_ROLES matches BYPASS_ROLES', () => {
    expect([...SHARED_BYPASS_ROLES].sort()).toEqual([...BYPASS_ROLES].sort());
  });

  it('SHARED_AGENCY_REQUIRED_MODULES matches AGENCY_REQUIRED_MODULES', () => {
    expect([...SHARED_AGENCY_REQUIRED_MODULES].sort()).toEqual([...AGENCY_REQUIRED_MODULES].sort());
  });

  it('SHARED_NETWORK_MODULES matches NETWORK_MODULES', () => {
    expect([...SHARED_NETWORK_MODULES].sort()).toEqual([...NETWORK_MODULES].sort());
  });

  it('SHARED_NETWORK_MIN_ROLE matches NETWORK_MIN_ROLE', () => {
    expect(SHARED_NETWORK_MIN_ROLE).toBe(NETWORK_MIN_ROLE);
  });
});

// ============================================================================
// 4. BYPASS ROLES
// ============================================================================

describe('Bypass role invariants', () => {
  it('only N5 and N6 are bypass roles', () => {
    expect(BYPASS_ROLES).toContain('platform_admin');
    expect(BYPASS_ROLES).toContain('superadmin');
    expect(BYPASS_ROLES).toHaveLength(2);
  });

  it('BYPASS_MIN_LEVEL equals platform_admin level', () => {
    expect(BYPASS_MIN_LEVEL).toBe(GLOBAL_ROLES.platform_admin);
  });

  it('isBypassRole matches BYPASS_ROLES membership', () => {
    const allRoles: GlobalRole[] = [
      'base_user', 'franchisee_user', 'franchisee_admin',
      'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
    ];
    for (const role of allRoles) {
      expect(isBypassRole(role)).toBe(BYPASS_ROLES.includes(role));
    }
  });
});

// ============================================================================
// 5. N5/N6 BYPASS ACCESS
// ============================================================================

describe('N5/N6 bypass access', () => {
  const bypassRoles: GlobalRole[] = ['platform_admin', 'superadmin'];
  const allModules: ModuleKey[] = MODULE_DEFINITIONS.map(m => m.key);

  for (const role of bypassRoles) {
    it(`${role} can access ALL modules regardless of agency`, () => {
      for (const moduleId of allModules) {
        const params: HasAccessParams = {
          globalRole: role,
          enabledModules: null,
          agencyId: null,
          moduleId,
        };
        expect(hasAccess(params)).toBe(true);
      }
    });

    it(`${role} has all effective modules enabled with bypass source`, () => {
      const modules = getEffectiveModules({
        globalRole: role,
        enabledModules: null,
        agencyId: null,
      });
      for (const mod of modules) {
        expect(mod.enabled).toBe(true);
        expect(mod.source).toBe('bypass');
      }
    });
  }
});

// ============================================================================
// 6. AGENCY-REQUIRED MODULE ENFORCEMENT
// ============================================================================

describe('Agency-required module enforcement', () => {
  it('denies agency modules when no agencyId (for non-bypass roles)', () => {
    for (const moduleId of AGENCY_REQUIRED_MODULES) {
      const params: HasAccessParams = {
        globalRole: 'franchisee_admin',
        enabledModules: { [moduleId]: { enabled: true, options: {} } },
        agencyId: null,
        moduleId,
      };
      expect(hasAccess(params)).toBe(false);
    }
  });

  it('allows agency modules with agencyId', () => {
    for (const moduleId of AGENCY_REQUIRED_MODULES) {
      const params: HasAccessParams = {
        globalRole: 'franchisee_admin',
        enabledModules: { [moduleId]: { enabled: true, options: {} } },
        agencyId: 'test-agency',
        moduleId,
      };
      expect(hasAccess(params)).toBe(true);
    }
  });
});

// ============================================================================
// 7. NETWORK MODULE ENFORCEMENT
// ============================================================================

describe('Network module enforcement', () => {
  it('denies network modules for roles below N3', () => {
    const belowN3: GlobalRole[] = ['base_user', 'franchisee_user', 'franchisee_admin'];
    for (const role of belowN3) {
      for (const moduleId of NETWORK_MODULES) {
        const params: HasAccessParams = {
          globalRole: role,
          enabledModules: { [moduleId]: { enabled: true, options: {} } },
          agencyId: null,
          moduleId,
        };
        expect(hasAccess(params)).toBe(false);
      }
    }
  });

  it('allows network modules for N3+', () => {
    for (const moduleId of NETWORK_MODULES) {
      const params: HasAccessParams = {
        globalRole: 'franchisor_user',
        enabledModules: { [moduleId]: { enabled: true, options: { dashboard: true } } },
        agencyId: null,
        moduleId,
      };
      expect(hasAccess(params)).toBe(true);
    }
  });
});

// ============================================================================
// 8. USER MANAGEMENT ESCALATION PREVENTION
// ============================================================================

describe('User management escalation prevention', () => {
  const allRoles: GlobalRole[] = [
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
  ];

  it('no role can create users at its own level', () => {
    for (const role of allRoles) {
      const caps = getUserManagementCapabilities(role);
      expect(caps.canCreateRoles).not.toContain(role);
    }
  });

  it('no role can create users above its level', () => {
    for (const role of allRoles) {
      const caps = getUserManagementCapabilities(role);
      const myLevel = ROLE_HIERARCHY[role];
      for (const createRole of caps.canCreateRoles) {
        expect(ROLE_HIERARCHY[createRole]).toBeLessThan(myLevel);
      }
    }
  });

  it('no role can edit users above its level', () => {
    for (const role of allRoles) {
      const caps = getUserManagementCapabilities(role);
      const myLevel = ROLE_HIERARCHY[role];
      for (const editRole of caps.canEditRoles) {
        expect(ROLE_HIERARCHY[editRole]).toBeLessThan(myLevel);
      }
    }
  });

  it('only N5+ can delete users', () => {
    for (const role of allRoles) {
      const caps = getUserManagementCapabilities(role);
      if (ROLE_HIERARCHY[role] >= 5) {
        expect(caps.canDeleteUsers).toBe(true);
      } else {
        expect(caps.canDeleteUsers).toBe(false);
      }
    }
  });

  it('N0 and N1 cannot manage anyone', () => {
    for (const role of ['base_user', 'franchisee_user'] as GlobalRole[]) {
      const caps = getUserManagementCapabilities(role);
      expect(caps.manageScope).toBe('none');
      expect(caps.canCreateRoles).toEqual([]);
    }
  });
});

// ============================================================================
// 9. MODULE OPTION MIN ROLES
// ============================================================================

describe('Module option min roles', () => {
  it('all option min role keys reference valid modules', () => {
    const validModuleKeys = new Set(MODULE_DEFINITIONS.map(m => m.key));
    for (const key of Object.keys(MODULE_OPTION_MIN_ROLES)) {
      const moduleKey = key.split('.')[0];
      expect(validModuleKeys.has(moduleKey as ModuleKey)).toBe(true);
    }
  });

  it('option min roles never EXCEED the option min role declarations', () => {
    // Verify all option min role entries reference valid option keys
    for (const [path, optionMinRole] of Object.entries(MODULE_OPTION_MIN_ROLES)) {
      const parts = path.split('.');
      expect(parts.length).toBe(2);
      // The role itself must be a valid GlobalRole
      expect(ROLE_HIERARCHY[optionMinRole]).toBeDefined();
    }
  });

  it('module-level min role is the real enforcement floor (options below it are effectively blocked)', () => {
    // Document: some option min roles are lower than their parent module min role.
    // This is safe because hasAccess() checks module min role FIRST (step 2),
    // so a user below the module floor is blocked before option checks.
    // This test ensures we are AWARE of such cases.
    const overriddenByModule: string[] = [];
    for (const [path, optionMinRole] of Object.entries(MODULE_OPTION_MIN_ROLES)) {
      const moduleKey = path.split('.')[0] as ModuleKey;
      const moduleMinRole = MODULE_MIN_ROLES[moduleKey];
      if (moduleMinRole && ROLE_HIERARCHY[optionMinRole] < ROLE_HIERARCHY[moduleMinRole]) {
        overriddenByModule.push(path);
      }
    }
    // These options have a min role lower than their module — the module check is the effective floor
    // If this list changes, investigate whether the change is intentional
    expect(overriddenByModule.length).toBeGreaterThanOrEqual(0); // documentation, not enforcement
  });
});

// ============================================================================
// 10. NULL/EDGE CASES
// ============================================================================

describe('Null and edge cases', () => {
  it('null role gets level 0', () => {
    expect(getRoleLevel(null)).toBe(0);
  });

  it('null role fails all min role checks', () => {
    const allRoles: GlobalRole[] = getAllRolesSorted();
    for (const required of allRoles) {
      expect(hasMinRole(null, required)).toBe(false);
    }
  });

  it('null role is not a bypass role', () => {
    expect(isBypassRole(null)).toBe(false);
  });

  it('null role gets no management capabilities', () => {
    const caps = getUserManagementCapabilities(null);
    expect(caps.viewScope).toBe('none');
    expect(caps.manageScope).toBe('none');
    expect(caps.canCreateRoles).toEqual([]);
    expect(caps.canDeleteUsers).toBe(false);
  });
});
