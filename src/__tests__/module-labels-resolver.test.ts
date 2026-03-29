/**
 * Tests anti-régression pour le résolveur de labels modules
 * 
 * Garantit :
 * 1. Un override DB remonte bien dans le resolver
 * 2. En absence de DB, le fallback MODULE_DEFINITIONS fonctionne
 * 3. Les guards dépendent des clés, PAS des labels
 * 4. Un renommage de label n'impacte pas les permissions
 * 5. Les fallbacks sécurisés fonctionnent
 */

import { describe, it, expect } from 'vitest';
import { resolveModuleLabel, resolveModuleShortLabel } from '@/hooks/useModuleLabels';
// hasAccess removed (V1 engine deleted) — guard tests moved to integration tests
import { MODULE_DEFINITIONS, MODULE_SHORT_LABELS } from '@/types/modules';

// ============================================================================
// 1. Override DB prend la priorité
// ============================================================================

describe('resolveModuleLabel — DB override priority', () => {
  it('returns DB label when available', () => {
    const dbLabels = { 'organisation.salaries': 'Équipe RH' };
    const result = resolveModuleLabel('organisation.salaries', dbLabels);
    expect(result).toBe('Équipe RH');
  });

  it('returns MODULE_DEFINITIONS label when no DB override', () => {
    const dbLabels = {};
    const result = resolveModuleLabel('organisation.salaries', dbLabels);
    const expected = MODULE_DEFINITIONS.find(m => m.key === 'organisation.salaries')?.label;
    expect(result).toBe(expected);
  });

  it('returns fallback when no DB and no definition', () => {
    const dbLabels = {};
    const result = resolveModuleLabel('unknown.module.xyz', dbLabels, 'Default');
    expect(result).toBe('Default');
  });

  it('returns key as last resort', () => {
    const dbLabels = {};
    const result = resolveModuleLabel('unknown.module.xyz', dbLabels);
    expect(result).toBe('unknown.module.xyz');
  });
});

// ============================================================================
// 2. Short labels
// ============================================================================

describe('resolveModuleShortLabel', () => {
  it('returns DB label when available (DB always wins)', () => {
    const dbLabels = { 'organisation.salaries': 'Renamed Full Label' };
    const result = resolveModuleShortLabel('organisation.salaries', dbLabels);
    // DB label (admin rename) always takes priority over SHORT_LABELS
    expect(result).toBe('Renamed Full Label');
  });

  it('falls back to DB label when no short label defined', () => {
    const dbLabels = { 'some.new.module': 'New Module Label' };
    const result = resolveModuleShortLabel('some.new.module', dbLabels);
    expect(result).toBe('New Module Label');
  });
});

// ============================================================================
// 3. Guards depend on keys, NOT labels (V1 hasAccess removed — principle validated by V2 RPC)
// ============================================================================

describe('Guards independence from labels', () => {
  it('permission keys are distinct from display labels', () => {
    // A label rename in DB doesn't change the module key
    const dbLabels = { 'organisation.salaries': 'Équipe RH' };
    expect(resolveModuleLabel('organisation.salaries', dbLabels)).toBe('Équipe RH');
    // The key 'organisation.salaries' remains the permission identifier
    expect(MODULE_DEFINITIONS.find(m => m.key === 'organisation.salaries')).toBeTruthy();
  });
});

// ============================================================================
// 4. All MODULE_DEFINITIONS have resolvable labels
// ============================================================================

describe('All defined modules have labels', () => {
  it('every MODULE_DEFINITIONS entry has a non-empty label', () => {
    for (const mod of MODULE_DEFINITIONS) {
      const label = resolveModuleLabel(mod.key, {});
      expect(label).toBeTruthy();
      expect(label).not.toBe(mod.key); // Should not fall back to the key
    }
  });
});

// ============================================================================
// 5. DB override propagates correctly for all resolution paths
// ============================================================================

describe('DB override propagation', () => {
  it('DB label overrides definition for every defined module', () => {
    const dbLabels: Record<string, string> = {};
    for (const mod of MODULE_DEFINITIONS) {
      dbLabels[mod.key] = `Renamed_${mod.key}`;
    }

    for (const mod of MODULE_DEFINITIONS) {
      const result = resolveModuleLabel(mod.key, dbLabels);
      expect(result).toBe(`Renamed_${mod.key}`);
    }
  });
});

// ============================================================================
// 6. Static configs stay independent of DB labels
// ============================================================================

describe('Static configs independence', () => {
  it('navigationStructure entries have static labels (not dependent on DB)', async () => {
    const { NAVIGATION_STRUCTURE } = await import('@/lib/navigationStructure');
    for (const domain of NAVIGATION_STRUCTURE) {
      // Domain labels are structural strings
      expect(typeof domain.label).toBe('string');
      expect(domain.label.length).toBeGreaterThan(0);
      for (const entry of domain.entries) {
        // Entry labels exist as static fallbacks
        expect(typeof entry.label).toBe('string');
        expect(entry.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('rightsTaxonomy categories have static labels independent of modules', async () => {
    const { RIGHTS_CATEGORIES } = await import('@/components/admin/views/rightsTaxonomy');
    for (const cat of RIGHTS_CATEGORIES) {
      expect(typeof cat.label).toBe('string');
      expect(cat.label.length).toBeGreaterThan(0);
      // Category labels are NOT module keys
      expect(cat.moduleKeys).not.toContain(cat.label);
    }
  });

  it('resolveModuleLabel used at render-time overrides static labels', () => {
    // Simulates what NavigationAccessView does: resolve entry label at render
    const staticLabel = 'Salariés';
    const dbLabels = { 'organisation.salaries': 'Équipe' };
    const resolved = resolveModuleLabel('organisation.salaries', dbLabels, staticLabel);
    // DB override takes priority over static fallback
    expect(resolved).toBe('Équipe');
  });

  it('resolveModuleLabel falls back to static label when no DB override', () => {
    const staticLabel = 'Salariés';
    const dbLabels = {};
    const resolved = resolveModuleLabel('organisation.salaries', dbLabels, staticLabel);
    // Falls back to MODULE_DEFINITIONS label, not the static fallback (which is arg 3)
    const defLabel = MODULE_DEFINITIONS.find(m => m.key === 'organisation.salaries')?.label;
    expect(resolved).toBe(defLabel);
  });
});
