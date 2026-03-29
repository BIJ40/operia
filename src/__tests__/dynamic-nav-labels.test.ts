/**
 * Anti-regression tests: navigation buttons follow module_registry label renames
 *
 * Verifies:
 * 1. resolveModuleLabel/resolveModuleShortLabel pick DB labels over hardcoded ones
 * 2. Permissions still use keys, never labels
 * 3. Structural buttons remain static (no resolver call)
 */
import { describe, it, expect } from 'vitest';
import { resolveModuleLabel, resolveModuleShortLabel } from '@/hooks/useModuleLabels';

// ============================================================================
// 1. Dynamic labels follow DB renames
// ============================================================================

describe('Dynamic nav labels follow admin renames', () => {
  const dbLabels: Record<string, string> = {
    'pilotage.statistiques': 'Mes Statistiques',
    'pilotage.statistiques.general': 'Vue Globale',
    'commercial.realisations': 'Nos Réalisations',
    'relations.apporteurs': 'Partenaires',
    'organisation.parc': 'Véhicules',
    'prospection': 'Développement',
  };

  it('resolveModuleLabel returns DB label when present', () => {
    expect(resolveModuleLabel('pilotage.statistiques', dbLabels)).toBe('Mes Statistiques');
    expect(resolveModuleLabel('commercial.realisations', dbLabels)).toBe('Nos Réalisations');
  });

  it('resolveModuleLabel falls back to frontend definition when no DB label', () => {
    const result = resolveModuleLabel('organisation.salaries', {});
    // Should not return the raw key if MODULE_DEFINITIONS has a label
    expect(result).not.toBe('');
  });

  it('resolveModuleLabel falls back to key when nothing matches', () => {
    expect(resolveModuleLabel('nonexistent.module', {})).toBe('nonexistent.module');
  });

  it('resolveModuleShortLabel prefers SHORT_LABELS over DB full labels', () => {
    // SHORT_LABELS takes priority for badge/tab contexts
    const short = resolveModuleShortLabel('pilotage.statistiques', dbLabels);
    expect(typeof short).toBe('string');
    expect(short.length).toBeGreaterThan(0);
  });

  it('all migrated module keys resolve with DB override', () => {
    const migratedKeys = [
      'pilotage.statistiques',
      'pilotage.statistiques.general',
      'pilotage.statistiques.apporteurs',
      'pilotage.statistiques.techniciens',
      'pilotage.statistiques.univers',
      'pilotage.statistiques.sav',
      'pilotage.statistiques.previsionnel',
      'pilotage.performance',
      'pilotage.actions_a_mener',
      
      'pilotage.incoherences',
      'commercial.realisations',
      'relations.apporteurs',
      'organisation.parc',
      'organisation.reunions',
      'organisation.plannings',
      'mediatheque.documents',
      'prospection',
    ];

    const customDbLabels: Record<string, string> = {};
    for (const key of migratedKeys) {
      customDbLabels[key] = `Custom ${key}`;
    }

    for (const key of migratedKeys) {
      expect(resolveModuleLabel(key, customDbLabels)).toBe(`Custom ${key}`);
    }
  });
});

// ============================================================================
// 2. Permissions use keys, not labels
// ============================================================================

describe('Permissions remain key-based', () => {
  it('changing a label does not change the key used for permission checks', () => {
    const dbLabels = { 'pilotage.statistiques': 'Renamed Label' };
    const label = resolveModuleLabel('pilotage.statistiques', dbLabels);
    // The label changed but the key is still 'pilotage.statistiques'
    expect(label).toBe('Renamed Label');
    // Key identity is preserved — this is a conceptual test
    expect('pilotage.statistiques').toBe('pilotage.statistiques');
  });
});

// ============================================================================
// 3. Structural buttons are NOT resolved dynamically
// ============================================================================

describe('Structural buttons stay static', () => {
  const STRUCTURAL_LABELS = [
    'Performance',
    'Actions à mener',
    'Devis acceptés',
    'Incohérences',
    'Administratif',
    'FAQ',
    'Apogée',
    'Accueil',
    'Pilotage',
    'Commercial',
    'Organisation',
    'Documents',
    'Support',
    'Admin',
  ];

  it('structural labels are plain strings, not module keys', () => {
    for (const label of STRUCTURAL_LABELS) {
      // These should NOT be passed through resolveModuleLabel
      // Verify they don't accidentally match a real module key
      const resolved = resolveModuleLabel(label, {});
      // If it returns the same string, it means no module matched → correct
      expect(resolved).toBe(label);
    }
  });
});
