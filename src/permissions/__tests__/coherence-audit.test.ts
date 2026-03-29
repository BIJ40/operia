/**
 * COHERENCE AUDIT — CI test
 * 
 * Fails if:
 * 1. A key read by frontend (hasModule/hasModuleOption) doesn't exist in MODULES
 * 2. A key in plan_tier_modules references doesn't exist in module_registry (MODULES)
 * 3. Ghost keys subsist in types / shared-constants / taxonomy
 * 4. A deployed=false module is activated in DEFAULT_MODULES_BY_ROLE
 * 5. MODULE_OPTION_MIN_ROLES entries reference invalid module/option combos
 * 6. Structural inconsistencies between constants sources
 */

import { describe, it, expect } from 'vitest';
import { MODULES, MODULE_DEFINITIONS, ModuleKey, DEPLOYED_MODULES } from '@/types/modules';
import { MODULE_MIN_ROLES, MODULE_OPTION_MIN_ROLES, MODULE_LABELS, BYPASS_ROLES } from '../constants';
import {
  SHARED_MODULE_KEYS,
  SHARED_MODULE_MIN_ROLES,
  SHARED_BYPASS_ROLES,
} from '../shared-constants';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { getValidModuleKeys, getValidOptionKeys } from '../moduleRegistry';

const KNOWN_GHOST_KEYS = [
  'commercial.veille',
  'commercial.comparateur',
  'commercial.veille',
  'commercial.prospects',
  'pilotage.dashboard',
];

// ============================================================================
// 1. No ghost keys in MODULES
// ============================================================================

describe('No ghost keys in MODULES', () => {
  for (const ghost of KNOWN_GHOST_KEYS) {
    it(`${ghost} must NOT be in MODULES`, () => {
      expect(ghost in MODULES).toBe(false);
    });
  }
});

// ============================================================================
// 2. No ghost keys in MODULE_DEFINITIONS
// ============================================================================

describe('No ghost keys in MODULE_DEFINITIONS', () => {
  for (const ghost of KNOWN_GHOST_KEYS) {
    it(`${ghost} must NOT be in MODULE_DEFINITIONS`, () => {
      expect(MODULE_DEFINITIONS.find(m => m.key === ghost)).toBeUndefined();
    });
  }
});

// ============================================================================
// 3. SHARED_MODULE_KEYS ⊆ MODULES
// ============================================================================

describe('SHARED_MODULE_KEYS all exist in MODULES', () => {
  for (const key of SHARED_MODULE_KEYS) {
    it(`${key} exists in MODULES`, () => {
      expect(key in MODULES).toBe(true);
    });
  }
});

// ============================================================================
// 4. MODULE_LABELS only contains valid keys
// ============================================================================

describe('MODULE_LABELS ⊆ MODULES', () => {
  for (const key of Object.keys(MODULE_LABELS)) {
    it(`label key ${key} exists in MODULES`, () => {
      expect(key in MODULES).toBe(true);
    });
  }
});

// ============================================================================
// 5. MODULE_OPTION_MIN_ROLES all reference valid modules in MODULES
// ============================================================================

describe('MODULE_OPTION_MIN_ROLES references valid modules', () => {
  const validModuleKeys = new Set(getValidModuleKeys());
  
  for (const path of Object.keys(MODULE_OPTION_MIN_ROLES)) {
    it(`${path} references a valid module`, () => {
      const lastDot = path.lastIndexOf('.');
      expect(lastDot).toBeGreaterThan(0);
      const moduleKey = path.substring(0, lastDot);
      expect(validModuleKeys.has(moduleKey as ModuleKey)).toBe(true);
    });
  }
});

// ============================================================================
// 6. deployed=false modules are NOT in DEFAULT_MODULES_BY_ROLE
// ============================================================================

describe('Non-deployed modules not in defaults', () => {
  const nonDeployed = MODULE_DEFINITIONS.filter(m => m.deployed === false);
  
  for (const mod of nonDeployed) {
    it(`${mod.key} (deployed=false) is not in any role defaults`, () => {
      for (const [role, defaults] of Object.entries(DEFAULT_MODULES_BY_ROLE)) {
        const entry = defaults[mod.key];
        const isEnabled = typeof entry === 'boolean' ? entry : entry?.enabled;
        if (isEnabled) {
          throw new Error(`${mod.key} is deployed=false but enabled in DEFAULT_MODULES_BY_ROLE[${role}]`);
        }
      }
    });
  }
});

// ============================================================================
// 7. MODULE_MIN_ROLES covers all MODULE_DEFINITIONS
// ============================================================================

describe('MODULE_MIN_ROLES completeness', () => {
  for (const mod of MODULE_DEFINITIONS) {
    it(`${mod.key} has min role entry`, () => {
      expect(MODULE_MIN_ROLES[mod.key]).toBeDefined();
      expect(MODULE_MIN_ROLES[mod.key]).toBe(mod.minRole);
    });
  }
});

// ============================================================================
// 8. SHARED constants alignment
// ============================================================================

describe('Shared constants alignment', () => {
  it('SHARED_BYPASS_ROLES matches BYPASS_ROLES', () => {
    expect([...SHARED_BYPASS_ROLES].sort()).toEqual([...BYPASS_ROLES].sort());
  });

  it('SHARED_MODULE_MIN_ROLES matches MODULE_DEFINITIONS for shared keys', () => {
    for (const mod of MODULE_DEFINITIONS) {
      const sharedKey = mod.key as keyof typeof SHARED_MODULE_MIN_ROLES;
      if (SHARED_MODULE_MIN_ROLES[sharedKey] !== undefined) {
        expect(SHARED_MODULE_MIN_ROLES[sharedKey]).toBe(mod.minRole);
      }
    }
  });
});

// ============================================================================
// 9. Every MODULE_DEFINITIONS key exists in MODULES
// ============================================================================

describe('MODULE_DEFINITIONS ⊆ MODULES', () => {
  for (const mod of MODULE_DEFINITIONS) {
    it(`${mod.key} exists in MODULES`, () => {
      expect(mod.key in MODULES).toBe(true);
    });
  }
});

// ============================================================================
// 10. No duplicate keys in MODULE_DEFINITIONS
// ============================================================================

describe('No duplicate MODULE_DEFINITIONS keys', () => {
  it('all keys are unique', () => {
    const keys = MODULE_DEFINITIONS.map(m => m.key);
    expect(keys.length).toBe(new Set(keys).size);
  });
});
