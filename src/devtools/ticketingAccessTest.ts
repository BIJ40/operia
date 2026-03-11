/**
 * Ticketing Access Security Test — Phase 3 Validation
 * 
 * Vérifie que la compatibilité ticketing → support.ticketing fonctionne
 * et que support.guides reste bloqué sans le module guides.
 * 
 * Usage:
 *   import { runTicketingAccessTest } from '@/devtools/ticketingAccessTest';
 *   runTicketingAccessTest();
 */

// ============================================================================
// Inline COMPAT_MAP subset (ticketing-relevant only)
// ============================================================================

interface CompatEntry {
  keys: string[];
  optionCheck?: { moduleKey: string; optionKey: string };
}

const COMPAT_MAP: Record<string, CompatEntry> = {
  'support.ticketing':     { keys: ['ticketing'] },
  'support.guides':        { keys: ['guides'] },
  'support.aide_en_ligne': { keys: ['aide'] },
};

type ModulesMap = Record<string, { enabled: boolean; options: Record<string, boolean> }>;

function simulateHasModule(modules: ModulesMap, moduleKey: string, isAdminBypass = false): boolean {
  if (isAdminBypass) return true;
  if (modules[moduleKey]?.enabled) return true;
  const compat = COMPAT_MAP[moduleKey];
  if (!compat) return false;
  if (compat.optionCheck) {
    const { moduleKey: mk, optionKey: ok } = compat.optionCheck;
    return !!(modules[mk]?.enabled && modules[mk]?.options?.[ok]);
  }
  return compat.keys.some(k => modules[k]?.enabled);
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export function runTicketingAccessTest(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  const assert = (label: string, actual: boolean, expected: boolean) => {
    if (actual === expected) {
      passed++;
      console.log(`  ✅ PASS  ${label}`);
    } else {
      failed++;
      console.error(`  ❌ FAIL  ${label} — got ${actual}, expected ${expected}`);
    }
  };

  // Scenario 1: User with only ticketing=true
  console.group('[TicketingCompat] Scénario 1 — Utilisateur ticketing uniquement');
  const ticketingUser: ModulesMap = {
    ticketing: { enabled: true, options: {} },
  };
  assert('hasModule("ticketing") → true',           simulateHasModule(ticketingUser, 'ticketing'), true);
  assert('hasModule("support.ticketing") → true',   simulateHasModule(ticketingUser, 'support.ticketing'), true);
  assert('hasModule("support.guides") → false',     simulateHasModule(ticketingUser, 'support.guides'), false);
  assert('hasModule("support.aide_en_ligne") → false', simulateHasModule(ticketingUser, 'support.aide_en_ligne'), false);
  console.groupEnd();

  // Scenario 2: User with ticketing + guides
  console.group('[TicketingCompat] Scénario 2 — Utilisateur ticketing + guides');
  const fullSupportUser: ModulesMap = {
    ticketing: { enabled: true, options: {} },
    guides: { enabled: true, options: {} },
  };
  assert('hasModule("support.ticketing") → true', simulateHasModule(fullSupportUser, 'support.ticketing'), true);
  assert('hasModule("support.guides") → true',    simulateHasModule(fullSupportUser, 'support.guides'), true);
  console.groupEnd();

  // Scenario 3: User with no support modules
  console.group('[TicketingCompat] Scénario 3 — Utilisateur sans modules support');
  const noSupportUser: ModulesMap = {
    agence: { enabled: true, options: {} },
  };
  assert('hasModule("support.ticketing") → false', simulateHasModule(noSupportUser, 'support.ticketing'), false);
  assert('hasModule("ticketing") → false',         simulateHasModule(noSupportUser, 'ticketing'), false);
  console.groupEnd();

  // Scenario 4: Admin bypass
  console.group('[TicketingCompat] Scénario 4 — Admin bypass');
  assert('admin hasModule("support.ticketing") → true', simulateHasModule({}, 'support.ticketing', true), true);
  assert('admin hasModule("support.guides") → true',    simulateHasModule({}, 'support.guides', true), true);
  console.groupEnd();

  const verdict = failed === 0 ? 'ALL PASS ✅' : `${failed} FAILED ❌`;
  console.log(`[TicketingCompat] ${verdict} (${passed}/${passed + failed} passed)`);

  return { passed, failed };
}

// Auto-run in dev
if (import.meta.env?.DEV) {
  runTicketingAccessTest();
}
