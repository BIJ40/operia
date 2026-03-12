/**
 * PermissionsRuntimeProof — Phase 3.5 Runtime Validation
 * 
 * Composant React utilisant les VRAIS hooks de production
 * (usePermissions().hasModule, usePermissions().hasModuleOption)
 * pour prouver que la résolution COMPAT fonctionne en runtime.
 * 
 * Usage: importer dans n'importe quelle page dev, ou via console:
 *   - Naviguer vers /?devtools=permissions-proof
 *   - Ou monter manuellement: <PermissionsRuntimeProof />
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { ModuleKey } from '@/types/modules';
import { useEffect, useMemo } from 'react';

interface ProofResult {
  label: string;
  path: 'usePermissions().hasModule' | 'usePermissions().hasModuleOption';
  key: string;
  optionKey?: string;
  result: boolean;
  expected: boolean;
  pass: boolean;
}

/**
 * Hook standalone — exécutable sans rendu.
 * Appelle les vrais hasModule/hasModuleOption du PermissionsContext.
 */
export function usePermissionsRuntimeProof() {
  const { hasModule, hasModuleOption, enabledModules, globalRole } = usePermissions();
  const { user } = useAuthCore();

  const results = useMemo<ProofResult[]>(() => {
    // Define test cases based on current user's modules
    const hasTicketingLegacy = (() => {
      const m = enabledModules as Record<string, any>;
      if (!m?.ticketing) return false;
      return typeof m.ticketing === 'boolean' ? m.ticketing : m.ticketing?.enabled === true;
    })();

    const hasGuidesLegacy = (() => {
      const m = enabledModules as Record<string, any>;
      if (!m?.guides) return false;
      return typeof m.guides === 'boolean' ? m.guides : m.guides?.enabled === true;
    })();

    const tests: ProofResult[] = [];

    // ── Ticketing resolution tests ──
    // These are the critical proof points requested
    tests.push({
      label: 'support.ticketing via hasModule (Path B)',
      path: 'usePermissions().hasModule',
      key: 'support.ticketing',
      result: hasModule('support.ticketing'),
      expected: hasTicketingLegacy,
      pass: hasModule('support.ticketing') === hasTicketingLegacy,
    });

    tests.push({
      label: 'ticketing (legacy) via hasModule',
      path: 'usePermissions().hasModule',
      key: 'ticketing',
      result: hasModule('ticketing' as ModuleKey),
      expected: hasTicketingLegacy,
      pass: hasModule('ticketing' as ModuleKey) === hasTicketingLegacy,
    });

    tests.push({
      label: 'support.guides via hasModule (Path B)',
      path: 'usePermissions().hasModule',
      key: 'support.guides',
      result: hasModule('support.guides' as ModuleKey),
      expected: hasGuidesLegacy,
      pass: hasModule('support.guides' as ModuleKey) === hasGuidesLegacy,
    });

    // ── Médiathèque isolation tests ──
    const hasDiversDocs = (() => {
      const m = enabledModules as Record<string, any>;
      if (!m?.divers_documents) return false;
      if (typeof m.divers_documents === 'boolean') return m.divers_documents;
      return m.divers_documents?.enabled === true;
    })();

    const hasDiversDocsGerer = (() => {
      const m = enabledModules as Record<string, any>;
      if (!m?.divers_documents || typeof m.divers_documents !== 'object') return false;
      return m.divers_documents?.enabled && m.divers_documents?.options?.gerer === true;
    })();

    tests.push({
      label: 'mediatheque.gerer via hasModule',
      path: 'usePermissions().hasModule',
      key: 'mediatheque.gerer',
      result: hasModule('mediatheque.gerer' as ModuleKey),
      expected: hasDiversDocsGerer,
      pass: hasModule('mediatheque.gerer' as ModuleKey) === hasDiversDocsGerer,
    });

    tests.push({
      label: 'organisation.documents_legaux via hasModule (should be false — no legacy)',
      path: 'usePermissions().hasModule',
      key: 'organisation.documents_legaux',
      result: hasModule('organisation.documents_legaux' as ModuleKey),
      // No legacy key exists for this, so it should be false unless explicitly granted
      expected: false,
      pass: !hasModule('organisation.documents_legaux' as ModuleKey),
    });

    return tests;
  }, [hasModule, hasModuleOption, enabledModules, globalRole]);

  return { results, user, enabledModules, globalRole };
}

/**
 * Composant de rendu — affiche les résultats dans la console ET en UI.
 */
export default function PermissionsRuntimeProof() {
  const { results, user, enabledModules, globalRole } = usePermissionsRuntimeProof();

  useEffect(() => {
    if (!user) return;

    console.group('[PermissionsRuntimeProof] 🔍 Phase 3.5 Validation');
    console.log('User:', user.email);
    console.log('GlobalRole:', globalRole);
    console.log('EnabledModules:', enabledModules);
    console.log('---');

    let passed = 0;
    let failed = 0;

    for (const r of results) {
      if (r.pass) {
        passed++;
        console.log(`  ✅ PASS  ${r.label} → ${r.result}`);
      } else {
        failed++;
        console.error(`  ❌ FAIL  ${r.label} → got ${r.result}, expected ${r.expected}`);
      }
    }

    const verdict = failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`;
    console.log(`\n[PermissionsRuntimeProof] ${verdict} (${passed}/${results.length})`);
    console.groupEnd();
  }, [results, user, enabledModules, globalRole]);

  if (!user) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Non authentifié — connectez-vous pour exécuter la preuve runtime.
      </div>
    );
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  return (
    <div className="p-4 space-y-4 font-mono text-xs">
      <div className="text-sm font-semibold text-foreground">
        🔍 Permissions Runtime Proof — Phase 3.5
      </div>
      <div className="text-muted-foreground">
        User: {user.email} | Role: {globalRole}
      </div>
      <div className="space-y-1">
        {results.map((r, i) => (
          <div key={i} className={`flex gap-2 ${r.pass ? 'text-green-600' : 'text-red-600'}`}>
            <span>{r.pass ? '✅' : '❌'}</span>
            <span className="text-muted-foreground">{r.path}('{r.key}')</span>
            <span>→ {String(r.result)}</span>
            {!r.pass && <span className="text-red-500">(expected {String(r.expected)})</span>}
          </div>
        ))}
      </div>
      <div className={`text-sm font-bold ${failed === 0 ? 'text-green-600' : 'text-red-600'}`}>
        {failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} ({passed}/{results.length})
      </div>
    </div>
  );
}
