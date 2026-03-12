/**
 * Tests: userModulesUtils — conversion logic + Phase 9 dual-key mapping
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
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(3);
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

  // ═══ Phase 9: Dual-key mapping tests ═══

  it('Phase 9: produces hierarchical key for legacy DB row', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'agence', options: null },
    ]);
    // Legacy key present
    expect(result.agence).toEqual({ enabled: true });
    // Hierarchical counterpart also present
    expect(result['pilotage.agence']).toEqual({ enabled: true });
  });

  it('Phase 9: produces legacy key for hierarchical DB row', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'pilotage.agence', options: { indicateurs: true } },
    ]);
    // Hierarchical key present
    expect(result['pilotage.agence']).toEqual({ enabled: true, options: { indicateurs: true } });
    // Legacy counterpart also present
    expect(result.agence).toEqual({ enabled: true, options: { indicateurs: true } });
  });

  it('Phase 9: hierarchical DB row takes precedence over legacy', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'aide', options: { user: true } },
      { module_key: 'support.aide_en_ligne', options: { user: true, agent: true } },
    ]);
    // Hierarchical row should win for the hierarchical key
    expect(result['support.aide_en_ligne']).toEqual({ enabled: true, options: { user: true, agent: true } });
  });

  it('Phase 9: all 11 legacy keys produce dual entries', () => {
    const legacyKeys = [
      'agence', 'stats', 'rh', 'parc', 'divers_apporteurs',
      'divers_plannings', 'divers_reunions', 'divers_documents',
      'guides', 'aide', 'realisations',
    ];
    const rows = legacyKeys.map(k => ({ module_key: k, options: null }));
    const result = userModulesToEnabledModules(rows);

    // Each legacy key should have both forms
    for (const key of legacyKeys) {
      expect(result[key]).toBeDefined();
    }
    // Check a few hierarchical counterparts
    expect(result['pilotage.agence']).toBeDefined();
    expect(result['organisation.salaries']).toBeDefined();
    expect(result['support.guides']).toBeDefined();
    expect(result['commercial.realisations']).toBeDefined();
  });

  it('Phase 9: non-mapped keys are not duplicated', () => {
    const result = userModulesToEnabledModules([
      { module_key: 'ticketing', options: null },
    ]);
    expect(result.ticketing).toEqual({ enabled: true });
    // ticketing has no legacy/hierarchical counterpart in the map
    const keys = Object.keys(result);
    expect(keys).toHaveLength(1);
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

  // ═══ Phase 9: Write normalization tests ═══

  it('Phase 9: normalizes hierarchical key to legacy for DB write', () => {
    const rows = enabledModulesToRows('user-1', {
      'pilotage.agence': { enabled: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].module_key).toBe('agence'); // Normalized to legacy
  });

  it('Phase 9: does not duplicate when both legacy and hierarchical present', () => {
    const rows = enabledModulesToRows('user-1', {
      agence: { enabled: true },
      'pilotage.agence': { enabled: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].module_key).toBe('agence');
  });

  it('Phase 9: non-mapped keys pass through unchanged', () => {
    const rows = enabledModulesToRows('user-1', {
      ticketing: { enabled: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].module_key).toBe('ticketing');
  });

  it('Phase 9: normalizes all 11 hierarchical keys', () => {
    const modules: Record<string, { enabled: boolean }> = {
      'pilotage.agence': { enabled: true },
      'pilotage.dashboard': { enabled: true },
      'organisation.salaries': { enabled: true },
      'organisation.parc': { enabled: true },
      'organisation.apporteurs': { enabled: true },
      'organisation.plannings': { enabled: true },
      'organisation.reunions': { enabled: true },
      'mediatheque.documents': { enabled: true },
      'support.guides': { enabled: true },
      'support.aide_en_ligne': { enabled: true },
      'commercial.realisations': { enabled: true },
    };
    const rows = enabledModulesToRows('user-1', modules);
    const keys = rows.map(r => r.module_key).sort();
    expect(keys).toEqual([
      'agence', 'aide', 'divers_apporteurs', 'divers_documents',
      'divers_plannings', 'divers_reunions', 'guides',
      'parc', 'realisations', 'rh', 'stats',
    ]);
  });
});

// ============================================================================
// isModuleEnabledInModules
// ============================================================================

describe('isModuleEnabledInModules', () => {
  it('returns false for null modules', () => {
    expect(isModuleEnabledInModules(null, 'pilotage.agence')).toBe(false);
  });

  it('returns false for missing module', () => {
    expect(isModuleEnabledInModules({}, 'pilotage.agence')).toBe(false);
  });

  it('returns true for enabled module object', () => {
    expect(isModuleEnabledInModules({ 'pilotage.agence': { enabled: true } }, 'pilotage.agence')).toBe(true);
  });

  it('returns false for disabled module object', () => {
    expect(isModuleEnabledInModules({ 'pilotage.agence': { enabled: false } }, 'pilotage.agence')).toBe(false);
  });

  it('handles boolean shorthand true', () => {
    expect(isModuleEnabledInModules({ 'pilotage.agence': true as any }, 'pilotage.agence')).toBe(true);
  });
});

// ============================================================================
// isModuleOptionEnabledInModules
// ============================================================================

describe('isModuleOptionEnabledInModules', () => {
  it('returns false for null modules', () => {
    expect(isModuleOptionEnabledInModules(null, 'organisation.salaries', 'rh_viewer')).toBe(false);
  });

  it('returns false for boolean module', () => {
    expect(isModuleOptionEnabledInModules({ 'organisation.salaries': true as any }, 'organisation.salaries', 'rh_viewer')).toBe(false);
  });

  it('returns true when option enabled', () => {
    const modules = { 'organisation.salaries': { enabled: true, options: { rh_viewer: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'organisation.salaries', 'rh_viewer')).toBe(true);
  });

  it('returns false when option disabled', () => {
    const modules = { 'organisation.salaries': { enabled: true, options: { rh_viewer: false } } };
    expect(isModuleOptionEnabledInModules(modules, 'organisation.salaries', 'rh_viewer')).toBe(false);
  });

  it('returns false when module disabled', () => {
    const modules = { 'organisation.salaries': { enabled: false, options: { rh_viewer: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'organisation.salaries', 'rh_viewer')).toBe(false);
  });

  it('returns false for missing option', () => {
    const modules = { 'organisation.salaries': { enabled: true, options: { rh_admin: true } } };
    expect(isModuleOptionEnabledInModules(modules, 'organisation.salaries', 'rh_viewer')).toBe(false);
  });
});
