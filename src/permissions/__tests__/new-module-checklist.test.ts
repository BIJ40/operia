/**
 * NEW MODULE CHECKLIST — CI guard
 * 
 * Ensures every new module follows the complete chain.
 * See docs/PERMISSIONS-REFERENCE.md §6 for the full checklist.
 */

import { describe, it, expect } from 'vitest';
import { 
  MODULES, 
  MODULE_DEFINITIONS, 
  ModuleKey, 
  PLAN_VISIBLE_MODULES,
  isModuleEnabled,
  isModuleOptionEnabled,
} from '@/types/modules';
import { MODULE_OPTION_MIN_ROLES } from '../constants';
import { SHARED_MODULE_KEYS, SHARED_MODULE_MIN_ROLES } from '../shared-constants';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { isValidModuleKey } from '../moduleRegistry';

// ============================================================================
// RULE 1: MODULE_DEFINITIONS ⊆ MODULES
// ============================================================================

describe('Rule 1: Every MODULE_DEFINITIONS key exists in MODULES', () => {
  for (const mod of MODULE_DEFINITIONS) {
    it(`${mod.key} is in MODULES`, () => {
      expect(mod.key in MODULES).toBe(true);
    });
  }
});

// ============================================================================
// RULE 2: Deployed non-adminOnly modules are plan-visible
// ============================================================================

describe('Rule 2: Deployed public modules are in PLAN_VISIBLE_MODULES', () => {
  const planVisible = new Set(PLAN_VISIBLE_MODULES);
  const deployedPublic = MODULE_DEFINITIONS.filter(m => m.deployed !== false && !m.adminOnly);
  
  for (const mod of deployedPublic) {
    it(`${mod.key} is plan-visible`, () => {
      expect(planVisible.has(mod.key)).toBe(true);
    });
  }
});

// ============================================================================
// RULE 3: MODULE_OPTION_MIN_ROLES reference valid modules
// ============================================================================

describe('Rule 3: MODULE_OPTION_MIN_ROLES paths reference valid MODULES', () => {
  for (const path of Object.keys(MODULE_OPTION_MIN_ROLES)) {
    it(`${path} has a valid module parent in MODULES`, () => {
      const lastDot = path.lastIndexOf('.');
      expect(lastDot).toBeGreaterThan(0);
      const moduleKey = path.substring(0, lastDot);
      expect(isValidModuleKey(moduleKey)).toBe(true);
    });
  }
});

// ============================================================================
// RULE 4: SHARED_MODULE_KEYS ⊆ MODULES
// ============================================================================

describe('Rule 4: SHARED_MODULE_KEYS all exist in MODULES', () => {
  for (const key of SHARED_MODULE_KEYS) {
    it(`shared key ${key} exists in MODULES`, () => {
      expect(key in MODULES).toBe(true);
    });
  }
});

// ============================================================================
// RULE 5: No structural root keys in MODULE_DEFINITIONS
// ============================================================================

describe('Rule 5: No bare root keys in MODULE_DEFINITIONS', () => {
  const FORBIDDEN_ROOTS = ['pilotage', 'commercial', 'organisation', 'admin', 'support', 'mediatheque', 'documents'];
  
  for (const root of FORBIDDEN_ROOTS) {
    it(`${root} is NOT in MODULE_DEFINITIONS`, () => {
      expect(MODULE_DEFINITIONS.find(m => m.key === root)).toBeUndefined();
    });
  }
});

// ============================================================================
// RULE 6: deployed=false not in defaults
// ============================================================================

describe('Rule 6: Non-deployed modules not in DEFAULT_MODULES_BY_ROLE', () => {
  const nonDeployed = MODULE_DEFINITIONS.filter(m => m.deployed === false);
  
  for (const mod of nonDeployed) {
    it(`${mod.key} (deployed=false) not enabled in any role defaults`, () => {
      for (const [_role, defaults] of Object.entries(DEFAULT_MODULES_BY_ROLE)) {
        const entry = defaults[mod.key];
        const isEnabled = typeof entry === 'boolean' ? entry : typeof entry === 'object' ? entry?.enabled : false;
        expect(isEnabled).not.toBe(true);
      }
    });
  }
});

// ============================================================================
// RULE 7: Documented exceptions
// ============================================================================

describe('Rule 7: Documented structural exceptions', () => {
  it('pilotage.statistiques is in MODULES but NOT in MODULE_DEFINITIONS', () => {
    expect('pilotage.statistiques' in MODULES).toBe(true);
    expect(MODULE_DEFINITIONS.find(m => m.key === 'pilotage.statistiques')).toBeUndefined();
  });

  it('organisation.documents_legaux is in MODULES but NOT in MODULE_DEFINITIONS', () => {
    expect('organisation.documents_legaux' in MODULES).toBe(true);
    expect(MODULE_DEFINITIONS.find(m => m.key === 'organisation.documents_legaux')).toBeUndefined();
  });
});

// ============================================================================
// RULE 8: No duplicate keys anywhere
// ============================================================================

describe('Rule 8: No duplicates', () => {
  it('MODULE_DEFINITIONS has unique keys', () => {
    const keys = MODULE_DEFINITIONS.map(m => m.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('SHARED_MODULE_KEYS has unique entries', () => {
    expect(SHARED_MODULE_KEYS.length).toBe(new Set(SHARED_MODULE_KEYS).size);
  });
});

// ============================================================================
// RULE 9: SHARED_MODULE_MIN_ROLES aligned with MODULE_DEFINITIONS
// ============================================================================

describe('Rule 9: Shared min_roles alignment', () => {
  for (const mod of MODULE_DEFINITIONS) {
    const sharedKey = mod.key as keyof typeof SHARED_MODULE_MIN_ROLES;
    if (SHARED_MODULE_MIN_ROLES[sharedKey] !== undefined) {
      it(`${mod.key} shared min_role matches MODULE_DEFINITIONS`, () => {
        expect(SHARED_MODULE_MIN_ROLES[sharedKey]).toBe(mod.minRole);
      });
    }
  }
});

// ============================================================================
// RULE 10: Fail-open prevention — module resolution defaults to deny
// ============================================================================

describe('Rule 10: No permissive fallbacks in module resolution', () => {
  it('isModuleEnabled returns false for null enabledModules', () => {
    expect(isModuleEnabled(null, 'ticketing')).toBe(false);
  });

  it('isModuleEnabled returns false for unknown key', () => {
    expect(isModuleEnabled({}, 'ticketing')).toBe(false);
  });

  it('isModuleOptionEnabled returns false for null enabledModules', () => {
    expect(isModuleOptionEnabled(null, 'ticketing', 'kanban')).toBe(false);
  });
});
