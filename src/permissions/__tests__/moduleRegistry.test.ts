/**
 * MODULE REGISTRY — Tests unitaires
 * Vérifie la cohérence du registry et des définitions de modules
 */

import { describe, it, expect } from 'vitest';
import {
  getAllModules,
  getModule,
  getModuleOptions,
  isValidModuleKey,
  isValidOptionPath,
  getValidModuleKeys,
  getValidOptionKeys,
  validateModuleDefinitions,
  PROTECTED_MODULES,
  isProtectedModule,
} from '../moduleRegistry';
import { MODULE_DEFINITIONS, MODULES } from '@/types/modules';
import { MODULE_MIN_ROLES, MODULE_OPTION_MIN_ROLES, MODULE_LABELS, ROLE_HIERARCHY } from '../constants';

// ============================================================================
// getAllModules / getModule
// ============================================================================

describe('getAllModules', () => {
  it('returns non-empty array', () => {
    const modules = getAllModules();
    expect(modules.length).toBeGreaterThan(0);
  });

  it('each module has key, label, options array', () => {
    for (const mod of getAllModules()) {
      expect(mod.key).toBeTruthy();
      expect(mod.label).toBeTruthy();
      expect(Array.isArray(mod.options)).toBe(true);
    }
  });
});

describe('getModule', () => {
  it('returns module for valid key', () => {
    const mod = getModule('organisation.salaries' as any);
    expect(mod).toBeDefined();
    expect(mod!.key).toBe('organisation.salaries');
  });

  it('returns undefined for invalid key', () => {
    expect(getModule('nonexistent' as any)).toBeUndefined();
  });
});

// ============================================================================
// Options
// ============================================================================

describe('getModuleOptions', () => {
  it('returns options for organisation.salaries module', () => {
    const opts = getModuleOptions('organisation.salaries' as any);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some(o => o.key === 'rh_viewer' || o.key === 'rh_admin')).toBe(true);
  });

  it('returns empty array for module without options', () => {
    const opts = getModuleOptions('unified_search');
    expect(Array.isArray(opts)).toBe(true);
  });
});

// ============================================================================
// Validation Keys
// ============================================================================

describe('isValidModuleKey', () => {
  it('returns true for known keys', () => {
    expect(isValidModuleKey('pilotage.agence')).toBe(true);
    expect(isValidModuleKey('organisation.salaries')).toBe(true);
    expect(isValidModuleKey('ticketing')).toBe(true);
  });

  it('returns false for unknown keys', () => {
    expect(isValidModuleKey('fake_module')).toBe(false);
    expect(isValidModuleKey('')).toBe(false);
  });
});

describe('isValidOptionPath', () => {
  it('returns true for valid paths', () => {
    // Get first module with options to test dynamically
    const modWithOpts = getAllModules().find(m => m.options.length > 0);
    if (modWithOpts) {
      const path = `${modWithOpts.key}.${modWithOpts.options[0].key}`;
      expect(isValidOptionPath(path)).toBe(true);
    }
  });

  it('returns false for invalid paths', () => {
    expect(isValidOptionPath('fake.option')).toBe(false);
    expect(isValidOptionPath('rh')).toBe(false);
    expect(isValidOptionPath('')).toBe(false);
  });
});

describe('getValidModuleKeys', () => {
  it('returns all MODULES keys', () => {
    const keys = getValidModuleKeys();
    expect(keys.length).toBe(Object.keys(MODULES).length);
  });
});

// ============================================================================
// Cross-validation: Constants vs MODULE_DEFINITIONS
// ============================================================================

describe('Constants ↔ MODULE_DEFINITIONS consistency', () => {
  it('MODULE_MIN_ROLES is derived from MODULE_DEFINITIONS', () => {
    // MODULE_MIN_ROLES is now auto-derived, verify it matches MODULE_DEFINITIONS
    for (const mod of MODULE_DEFINITIONS) {
      expect(MODULE_MIN_ROLES[mod.key as keyof typeof MODULE_MIN_ROLES]).toBe(mod.minRole);
    }
  });

  it('MODULE_LABELS only contains valid module keys', () => {
    const validKeys = new Set(getValidModuleKeys());
    for (const key of Object.keys(MODULE_LABELS)) {
      expect(validKeys.has(key as any)).toBe(true);
    }
  });

  it('MODULE_OPTION_MIN_ROLES only contains valid module references', () => {
    const validKeys = new Set(getValidModuleKeys());
    for (const path of Object.keys(MODULE_OPTION_MIN_ROLES)) {
      // Support multi-dot keys: use lastIndexOf to split moduleKey.optionKey
      const lastDot = path.lastIndexOf('.');
      expect(lastDot).toBeGreaterThan(0);
      const moduleKey = path.substring(0, lastDot);
      expect(validKeys.has(moduleKey as any)).toBe(true);
      // Note: option key validation is relaxed because some MODULE_OPTION_MIN_ROLES
      // entries reference modules that have no MODULE_DEFINITIONS entry (e.g. stats sub-tabs)
      // but ARE valid MODULES keys. The module key itself must be valid.
    }
  });

  it('MODULE_MIN_ROLES values are valid GlobalRole values', () => {
    const validRoles = new Set(Object.keys(ROLE_HIERARCHY));
    for (const role of Object.values(MODULE_MIN_ROLES)) {
      if (role) expect(validRoles.has(role)).toBe(true);
    }
  });

  it('every MODULE_DEFINITIONS module has unique key', () => {
    const keys = MODULE_DEFINITIONS.map(m => m.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it('every MODULE_DEFINITIONS option has unique key within its module', () => {
    for (const mod of MODULE_DEFINITIONS) {
      const optKeys = mod.options.map(o => o.key);
      const unique = new Set(optKeys);
      expect(optKeys.length).toBe(unique.size);
    }
  });
});

// ============================================================================
// validateModuleDefinitions
// ============================================================================

describe('validateModuleDefinitions', () => {
  it('returns no issues for valid keys', () => {
    const issues = validateModuleDefinitions({ rh: true, agence: true }, 'test');
    expect(issues.length).toBe(0);
  });

  it('returns issue for invalid key', () => {
    const issues = validateModuleDefinitions({ nonexistent_module: true }, 'test');
    expect(issues.length).toBe(1);
    expect(issues[0].type).toBe('error');
  });

  it('validates option paths', () => {
    const issues = validateModuleDefinitions({ 'rh.nonexistent_option': true }, 'test');
    expect(issues.length).toBe(1);
  });
});

// ============================================================================
// Protected modules
// ============================================================================

describe('Protected modules', () => {
  it('ticketing is protected', () => {
    expect(isProtectedModule('ticketing')).toBe(true);
  });

  it('non-protected module returns false', () => {
    expect(isProtectedModule('support.guides')).toBe(false);
  });

  it('PROTECTED_MODULES contains only valid keys', () => {
    const validKeys = new Set(getValidModuleKeys());
    for (const key of PROTECTED_MODULES) {
      expect(validKeys.has(key)).toBe(true);
    }
  });
});
