/**
 * Tests: userModulesUtils — conversion logic
 */
import { describe, it, expect } from 'vitest';
import {
  userModulesToEnabledModules,
  enabledModulesToRows,
  isModuleEnabledInModules,
  isModuleOptionEnabledInModules,
} from '@/lib/userModulesUtils';

// ============================================================================
// userModulesToEnabledModules
// ============================================================================

describe('userModulesToEnabledModules', () => {
  it('returns empty object for null', () => {
    expect(userModulesToEnabledModules(null)).toEqual({});
  });

  it('returns empty object for empty array', () => {
    expect(userModulesToEnabledModules([])).toEqual({});
  });

  it('converts simple module row', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'agence', options: null },
    ]);
    expect(result.agence).toEqual({ enabled: true });
  });

  it('converts module with options', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'rh', options: { rh_viewer: true, rh_admin: false } },
    ]);
    expect(result.rh).toEqual({ enabled: true, options: { rh_viewer: true, rh_admin: false } });
  });

  it('skips modules where all options are false', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'parc', options: { vehicules: false, epi: false } },
    ]);
    expect(result.parc).toBeUndefined();
  });

  it('handles multiple modules', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'agence', options: null },
      { module_key: 'rh', options: { rh_viewer: true } },
      { module_key: 'guides', options: { apogee: true, faq: true } },
    ]);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.agence).toBeDefined();
    expect(result.rh).toBeDefined();
    expect(result.guides).toBeDefined();
  });

  it('ignores non-boolean options', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'test' as any, options: { key: 'string_value' } },
    ]);
    // No boolean entries → module gets { enabled: true } (no options)
    expect(result['test' as any]).toEqual({ enabled: true });
  });

  it('handles options with mixed boolean/non-boolean', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'aide', options: { user: true, agent: false, extra: 'ignored' as any } },
    ]);
    expect(result.aide).toEqual({ enabled: true, options: { user: true, agent: false } });
  });
});

// ============================================================================
// enabledModulesToRows
// ============================================================================

describe('enabledModulesToRows', () => {
  it('returns empty array for null', () => {
    expect(enabledModulesToRows('user-1', null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(enabledModulesToRows('user-1', undefined)).toEqual([]);
  });

  it('converts simple enabled module', () => {
    const rows = enabledModulesToRows('user-1', {
      agence: { enabled: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].module_key).toBe('agence');
    expect(rows[0].user_id).toBe('user-1');
  });

  it('skips disabled modules', () => {
    const rows = enabledModulesToRows('user-1', {
      agence: { enabled: false },
    });
    expect(rows).toHaveLength(0);
  });

  it('filters options to only true values', () => {
    const rows = enabledModulesToRows('user-1', {
      rh: { enabled: true, options: { rh_viewer: true, rh_admin: false } },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].options).toEqual({ rh_viewer: true });
  });

  it('skips modules with all options false', () => {
    const rows = enabledModulesToRows('user-1', {
      parc: { enabled: true, options: { vehicules: false, epi: false, equipements: false } },
    });
    expect(rows).toHaveLength(0);
  });

  it('preserves modules with no options (like divers_plannings)', () => {
    const rows = enabledModulesToRows('user-1', {
      divers_plannings: { enabled: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].module_key).toBe('divers_plannings');
  });

  it('sets enabled_by when provided', () => {
    const rows = enabledModulesToRows('user-1', {
      agence: { enabled: true },
    }, 'admin-1');
    expect(rows[0].enabled_by).toBe('admin-1');
  });
});

// ============================================================================
// isModuleEnabledInModules
// ============================================================================

describe('isModuleEnabledInModules', () => {
  it('returns false for null modules', () => {
    expect(isModuleEnabledInModules(null, 'agence')).toBe(false);
  });

  it('returns false for missing module', () => {
    expect(isModuleEnabledInModules({}, 'agence')).toBe(false);
  });

  it('returns true for enabled module object', () => {
    expect(isModuleEnabledInModules({ agence: { enabled: true } }, 'agence')).toBe(true);
  });

  it('returns false for disabled module object', () => {
    expect(isModuleEnabledInModules({ agence: { enabled: false } }, 'agence')).toBe(false);
  });

  it('handles boolean shorthand true', () => {
    expect(isModuleEnabledInModules({ agence: true as any }, 'agence')).toBe(true);
  });
});

// ============================================================================
// isModuleOptionEnabledInModules
// ============================================================================

describe('isModuleOptionEnabledInModules', () => {
  it('returns false for null modules', () => {
    expect(isModuleOptionEnabledInModules(null, 'rh', 'rh_viewer')).toBe(false);
  });

  it('returns false for boolean module', () => {
    expect(isModuleOptionEnabledInModules({ rh: true as any }, 'rh', 'rh_viewer')).toBe(false);
  });

  it('returns true when option enabled', () => {
    const modules = { rh: { enabled: true, options: { rh_viewer: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'rh', 'rh_viewer')).toBe(true);
  });

  it('returns false when option disabled', () => {
    const modules = { rh: { enabled: true, options: { rh_viewer: false } } };
    expect(isModuleOptionEnabledInModules(modules, 'rh', 'rh_viewer')).toBe(false);
  });

  it('returns false when module disabled', () => {
    const modules = { rh: { enabled: false, options: { rh_viewer: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'rh', 'rh_viewer')).toBe(false);
  });

  it('returns false for missing option', () => {
    const modules = { rh: { enabled: true, options: { rh_admin: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'rh', 'rh_viewer')).toBe(false);
  });
});
