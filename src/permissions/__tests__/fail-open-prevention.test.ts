/**
 * FAIL-OPEN PREVENTION TESTS
 * 
 * Structural guards ensuring COALESCE(..., true) or equivalent
 * permissive fallback patterns can never return to the codebase.
 * 
 * These tests verify that the permissions engine:
 * 1. Never defaults to true for unknown/missing modules
 * 2. Never grants access when enabledModules is empty/null (for non-default, non-bypass)
 * 3. getEffectiveModules never enables a module without explicit source
 */

import { describe, it, expect } from 'vitest';
import { hasAccess, getEffectiveModules, isBypassRole } from '../permissionsEngine';
import { MODULE_DEFINITIONS, ModuleKey } from '@/types/modules';
import { GlobalRole } from '@/types/globalRoles';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';

// ============================================================================
// 1. Unknown module key → always denied (for non-bypass)
// ============================================================================

describe('Unknown module key is always denied', () => {
  const nonBypassRoles: GlobalRole[] = [
    'base_user', 'franchisee_user', 'franchisee_admin',
    'franchisor_user', 'franchisor_admin',
  ];

  for (const role of nonBypassRoles) {
    it(`${role}: unknown module denied`, () => {
      expect(hasAccess({
        globalRole: role,
        enabledModules: {},
        agencyId: 'agency-1',
        moduleId: 'totally_fake_module_xyz' as ModuleKey,
      })).toBe(false);
    });
  }
});

// ============================================================================
// 2. Empty enabledModules → only default modules for the role
// ============================================================================

describe('Empty enabledModules = only defaults', () => {
  const rolesToTest: GlobalRole[] = [
    'base_user', 'franchisee_user', 'franchisee_admin',
  ];

  for (const role of rolesToTest) {
    it(`${role}: effective modules with {} match only defaults`, () => {
      const effectiveModules = getEffectiveModules({
        globalRole: role,
        enabledModules: {},
        agencyId: 'agency-1',
      });
      
      const enabledModules = effectiveModules.filter(m => m.enabled);
      const defaultKeys = Object.keys(DEFAULT_MODULES_BY_ROLE[role] || {});
      
      for (const em of enabledModules) {
        // Every enabled module must come from 'default' source
        expect(em.source).toBe('default');
        // And must be in the role's defaults
        expect(defaultKeys).toContain(em.id);
      }
    });
  }
});

// ============================================================================
// 3. getEffectiveModules never produces enabled=true without explicit source
// ============================================================================

describe('No module enabled without explicit source', () => {
  it('null modules, non-bypass role → no explicit modules', () => {
    const modules = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: null,
      agencyId: 'agency-1',
    });
    
    const explicitEnabled = modules.filter(m => m.source === 'explicit' && m.enabled);
    expect(explicitEnabled).toHaveLength(0);
  });

  it('null role → no modules at all', () => {
    const modules = getEffectiveModules({
      globalRole: null,
      enabledModules: null,
      agencyId: null,
    });
    
    expect(modules).toHaveLength(0);
  });
});

// ============================================================================
// 4. Disabled module in enabledModules stays disabled
// ============================================================================

describe('Disabled module stays disabled', () => {
  it('enabled=false in enabledModules → denied', () => {
    const modules = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'pilotage.agence': { enabled: false, options: {} },
      },
      agencyId: 'agency-1',
    });
    
    const agenceModule = modules.find(m => m.id === 'pilotage.agence');
    expect(agenceModule).toBeDefined();
    expect(agenceModule!.enabled).toBe(false);
  });
});

// ============================================================================
// 5. isBypassRole is strict
// ============================================================================

describe('Bypass role is strictly N5+', () => {
  it('only platform_admin and superadmin bypass', () => {
    const allRoles: GlobalRole[] = [
      'base_user', 'franchisee_user', 'franchisee_admin',
      'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin',
    ];
    for (const role of allRoles) {
      if (role === 'platform_admin' || role === 'superadmin') {
        expect(isBypassRole(role)).toBe(true);
      } else {
        expect(isBypassRole(role)).toBe(false);
      }
    }
  });

  it('null is not bypass', () => {
    expect(isBypassRole(null)).toBe(false);
  });
});
