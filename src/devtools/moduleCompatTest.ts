/**
 * Module Compatibility Test — Phase 3 + 3.5 Validation
 * 
 * Script pur TypeScript, sans dépendance React.
 * Teste la logique COMPAT_MAP via la fonction resolveModuleViaCompat partagée
 * ET simule le comportement de hasModule dans useEffectiveModules.
 * 
 * Usage:
 *   import { runModuleCompatTest } from '@/devtools/moduleCompatTest';
 *   runModuleCompatTest();
 */

import { COMPAT_MAP, resolveModuleViaCompat, resolveModuleOptionViaCompat } from '@/permissions/compatMap';
import type { EnabledModules } from '@/types/modules';

// ============================================================================
// SIMULATE hasModule — reproduit la logique exacte de useEffectiveModules
// ============================================================================

type ModulesMap = Record<string, { enabled: boolean; options: Record<string, boolean> }>;

function simulateHasModule(modules: ModulesMap, moduleKey: string, isAdminBypass = false): boolean {
  if (isAdminBypass) return true;
  // 1. Direct check
  if (modules[moduleKey]?.enabled) return true;
  // 2. Compat fallback (shared COMPAT_MAP)
  const compat = COMPAT_MAP[moduleKey];
  if (!compat) return false;
  if (compat.optionCheck) {
    const { moduleKey: mk, optionKey: ok } = compat.optionCheck;
    return !!(modules[mk]?.enabled && modules[mk]?.options?.[ok]);
  }
  return compat.keys.some(k => modules[k]?.enabled);
}

// ============================================================================
// TEST CASES
// ============================================================================

interface TestAssertion {
  label: string;
  key: string;
  expected: boolean;
}

interface TestCase {
  name: string;
  modules: ModulesMap;
  assertions: TestAssertion[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Cas 1 — ticketing (Chemin A: useEffectiveModules)',
    modules: { ticketing: { enabled: true, options: {} } },
    assertions: [
      { label: 'hasModule("ticketing")',          key: 'ticketing',          expected: true },
      { label: 'hasModule("support.ticketing")',   key: 'support.ticketing',  expected: true },
      { label: 'hasModule("support.guides")',      key: 'support.guides',     expected: false },
    ],
  },
  {
    name: 'Cas 2 — agence',
    modules: { agence: { enabled: true, options: {} } },
    assertions: [
      { label: 'hasModule("pilotage.performance")',     key: 'pilotage.performance',     expected: true },
      { label: 'hasModule("pilotage.actions_a_mener")', key: 'pilotage.actions_a_mener', expected: true },
    ],
  },
  {
    name: 'Cas 3 — prospection avec option dashboard',
    modules: { prospection: { enabled: true, options: { dashboard: true } } },
    assertions: [
      { label: 'hasModule("commercial.suivi_client")', key: 'commercial.suivi_client', expected: true },
      { label: 'hasModule("commercial.comparateur")',  key: 'commercial.comparateur',  expected: false },
    ],
  },
];

// ============================================================================
// CHEMIN B TESTS — resolveModuleViaCompat (used by AuthContext + ModuleGuard)
// ============================================================================

interface CheminBTest {
  name: string;
  enabledModules: EnabledModules;
  assertions: { label: string; key: string; expected: boolean }[];
}

const CHEMIN_B_TESTS: CheminBTest[] = [
  {
    name: 'Chemin B — ticketing compat',
    enabledModules: { ticketing: { enabled: true, options: {} } },
    assertions: [
      { label: 'resolveModuleViaCompat("support.ticketing")', key: 'support.ticketing', expected: true },
      { label: 'resolveModuleViaCompat("support.guides")',    key: 'support.guides',    expected: false },
      { label: 'resolveModuleViaCompat("ticketing")',         key: 'ticketing',          expected: false }, // not in COMPAT_MAP, direct only
    ],
  },
  {
    name: 'Chemin B — mediatheque compat (isolation)',
    enabledModules: { divers_documents: { enabled: true, options: { consulter: true, gerer: true, corbeille_vider: false } } },
    assertions: [
      { label: 'resolveModuleViaCompat("mediatheque.consulter")', key: 'mediatheque.consulter', expected: true },
      { label: 'resolveModuleViaCompat("mediatheque.gerer")',     key: 'mediatheque.gerer',     expected: true },
      { label: 'resolveModuleViaCompat("mediatheque.corbeille")', key: 'mediatheque.corbeille',  expected: false },
      // CRITICAL: organisation.documents_legaux must NOT resolve via divers_documents
      { label: 'resolveModuleViaCompat("organisation.documents_legaux") → false (no legacy)', key: 'organisation.documents_legaux', expected: false },
    ],
  },
  {
    name: 'Chemin B — resolveModuleOptionViaCompat',
    enabledModules: { divers_documents: { enabled: true, options: { gerer: true, corbeille_vider: false } } },
    assertions: [
      { label: 'resolveModuleOptionViaCompat("mediatheque", "gerer")',     key: 'mediatheque|gerer',     expected: true },
      { label: 'resolveModuleOptionViaCompat("mediatheque", "corbeille")', key: 'mediatheque|corbeille', expected: false },
    ],
  },
];

// ============================================================================
// RUNNER
// ============================================================================

export function runModuleCompatTest(): { passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;

  const assert = (label: string, actual: boolean, expected: boolean) => {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ PASS  ${label} → ${actual}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL  ${label} → got ${actual}, expected ${expected}`);
    }
  };

  // Chemin A tests
  for (const tc of TEST_CASES) {
    console.group(`[ModuleCompatTest] ${tc.name}`);
    for (const a of tc.assertions) {
      assert(a.label, simulateHasModule(tc.modules, a.key), a.expected);
    }
    console.groupEnd();
  }

  // Chemin B tests
  for (const tc of CHEMIN_B_TESTS) {
    console.group(`[ModuleCompatTest] ${tc.name}`);
    for (const a of tc.assertions) {
      if (a.key.includes('|')) {
        // resolveModuleOptionViaCompat test
        const [mod, opt] = a.key.split('|');
        assert(a.label, resolveModuleOptionViaCompat(tc.enabledModules, mod, opt), a.expected);
      } else {
        assert(a.label, resolveModuleViaCompat(tc.enabledModules, a.key), a.expected);
      }
    }
    console.groupEnd();
  }

  const total = passed + failed;
  const verdict = failed === 0 ? 'ALL PASS ✅' : `${failed}/${total} FAILED ❌`;
  console.log(`[ModuleCompatTest] ${verdict} (${passed}/${total} passed)`);

  return { passed, failed, total };
}

// Auto-run in dev
if (import.meta.env?.DEV) {
  runModuleCompatTest();
}
