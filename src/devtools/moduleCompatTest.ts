/**
 * Module Compatibility Test — Phase 3 Validation
 * 
 * Script pur TypeScript, sans dépendance React.
 * Simule la logique hasModule de useEffectiveModules avec le COMPAT_MAP.
 * 
 * Usage: import depuis la console dev ou un composant debug:
 *   import { runModuleCompatTest } from '@/devtools/moduleCompatTest';
 *   runModuleCompatTest();
 */

// ============================================================================
// COMPAT_MAP — copie fidèle de useEffectiveModules.ts
// ============================================================================

interface CompatEntry {
  keys: string[];
  optionCheck?: { moduleKey: string; optionKey: string };
}

const COMPAT_MAP: Record<string, CompatEntry> = {
  'pilotage.statistiques':              { keys: ['stats'] },
  'pilotage.statistiques.general':      { keys: ['stats'] },
  'pilotage.statistiques.apporteurs':   { keys: ['stats'] },
  'pilotage.statistiques.techniciens':  { keys: ['stats'] },
  'pilotage.statistiques.univers':      { keys: ['stats'] },
  'pilotage.statistiques.sav':          { keys: ['stats'] },
  'pilotage.statistiques.previsionnel': { keys: ['stats'] },
  'pilotage.statistiques.exports':      { keys: ['stats'], optionCheck: { moduleKey: 'stats', optionKey: 'exports' } },
  'pilotage.performance':     { keys: ['agence'] },
  'pilotage.actions_a_mener': { keys: ['agence'] },
  'pilotage.devis_acceptes':  { keys: ['agence'] },
  'pilotage.incoherences':    { keys: ['agence'] },
  'commercial.suivi_client': { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'dashboard' } },
  'commercial.comparateur':  { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'comparateur' } },
  'commercial.veille':       { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'veille' } },
  'commercial.prospects':    { keys: ['prospection'], optionCheck: { moduleKey: 'prospection', optionKey: 'prospects' } },
  'commercial.realisations': { keys: ['realisations'] },
  'organisation.salaries':         { keys: ['rh'] },
  'organisation.apporteurs':       { keys: ['divers_apporteurs'] },
  'organisation.plannings':        { keys: ['divers_plannings'] },
  'organisation.reunions':         { keys: ['divers_reunions'] },
  'organisation.parc':             { keys: ['parc'] },
  'organisation.documents_legaux': { keys: ['divers_documents'] },
  'mediatheque.consulter': { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'consulter' } },
  'mediatheque.gerer':     { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'gerer' } },
  'mediatheque.corbeille':  { keys: ['divers_documents'], optionCheck: { moduleKey: 'divers_documents', optionKey: 'corbeille_vider' } },
  'support.aide_en_ligne': { keys: ['aide'] },
  'support.guides':        { keys: ['guides'] },
  'support.ticketing':     { keys: ['ticketing'] },
  'admin.gestion':    { keys: ['admin_plateforme'] },
  'admin.franchiseur': { keys: ['reseau_franchiseur'] },
  'admin.ia':         { keys: ['admin_plateforme'] },
  'admin.contenu':    { keys: ['admin_plateforme'] },
  'admin.ops':        { keys: ['admin_plateforme'] },
  'admin.plateforme': { keys: ['admin_plateforme'] },
};

// ============================================================================
// SIMULATE hasModule — reproduit la logique exacte
// ============================================================================

type ModulesMap = Record<string, { enabled: boolean; options: Record<string, boolean> }>;

function simulateHasModule(modules: ModulesMap, moduleKey: string, isAdminBypass = false): boolean {
  if (isAdminBypass) return true;
  // 1. Direct check
  if (modules[moduleKey]?.enabled) return true;
  // 2. Compat fallback
  const compat = COMPAT_MAP[moduleKey];
  if (!compat) return false;
  // 3. Option-based check
  if (compat.optionCheck) {
    const { moduleKey: mk, optionKey: ok } = compat.optionCheck;
    return !!(modules[mk]?.enabled && modules[mk]?.options?.[ok]);
  }
  // 4. Key-based fallback (OR)
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
    name: 'Cas 1 — ticketing',
    modules: {
      ticketing: { enabled: true, options: {} },
    },
    assertions: [
      { label: 'hasModule("ticketing")',          key: 'ticketing',          expected: true },
      { label: 'hasModule("support.ticketing")',   key: 'support.ticketing',  expected: true },
      { label: 'hasModule("support.guides")',      key: 'support.guides',     expected: false },
    ],
  },
  {
    name: 'Cas 2 — agence',
    modules: {
      agence: { enabled: true, options: {} },
    },
    assertions: [
      { label: 'hasModule("pilotage.performance")',     key: 'pilotage.performance',     expected: true },
      { label: 'hasModule("pilotage.actions_a_mener")', key: 'pilotage.actions_a_mener', expected: true },
    ],
  },
  {
    name: 'Cas 3 — prospection avec option dashboard',
    modules: {
      prospection: { enabled: true, options: { dashboard: true } },
    },
    assertions: [
      { label: 'hasModule("commercial.suivi_client")', key: 'commercial.suivi_client', expected: true },
      { label: 'hasModule("commercial.comparateur")',  key: 'commercial.comparateur',  expected: false },
    ],
  },
];

// ============================================================================
// RUNNER
// ============================================================================

export function runModuleCompatTest(): { passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    console.group(`[ModuleCompatTest] ${tc.name}`);
    for (const a of tc.assertions) {
      const result = simulateHasModule(tc.modules, a.key);
      const ok = result === a.expected;
      if (ok) {
        passed++;
        console.log(`  ✅ PASS  ${a.label} → ${result}`);
      } else {
        failed++;
        console.error(`  ❌ FAIL  ${a.label} → got ${result}, expected ${a.expected}`);
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
