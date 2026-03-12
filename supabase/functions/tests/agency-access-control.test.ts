/**
 * Tests anti-régression : contrôle d'accès agence basé sur agency_id (UUID)
 * 
 * DOCTRINE: agency_id est la source unique de vérité pour l'autorisation d'accès agence.
 * Le champ agence (slug) ne doit jamais servir de critère d'autorisation.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { assertAgencyAccess, assertAgencyAccessBySlug } from '../_shared/auth.ts';
import { GLOBAL_ROLES } from '../_shared/roles.ts';
import type { UserContext } from '../_shared/auth.ts';

function makeContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'test-user-id',
    email: 'test@example.com',
    globalRole: 'agency_user',
    globalRoleLevel: GLOBAL_ROLES.agency_user ?? 0,
    agencyId: 'uuid-agency-A',
    agencySlug: 'agence-a',
    supportLevel: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 1. Utilisateur avec agency_id correct → accès autorisé
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: matching agency_id grants access', () => {
  const ctx = makeContext({ agencyId: 'uuid-agency-A' });
  const result = assertAgencyAccess(ctx, 'uuid-agency-A');
  assertEquals(result.allowed, true);
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Utilisateur avec slug correct mais agency_id incorrect → refusé
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: correct slug but wrong agency_id denies access', () => {
  const ctx = makeContext({
    agencyId: 'uuid-agency-B',   // UUID ne correspond pas
    agencySlug: 'agence-a',       // slug correspondrait si on le testait
  });
  const result = assertAgencyAccess(ctx, 'uuid-agency-A');
  assertEquals(result.allowed, false);
  assertEquals(result.error, 'Accès non autorisé à cette agence');
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Divergence agence/agency_id → agency_id gagne
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: agency_id prevails over slug divergence', () => {
  // Cas: slug dit "agence-a" mais agency_id pointe vers B
  const ctx = makeContext({
    agencyId: 'uuid-agency-B',
    agencySlug: 'agence-a',
  });
  
  // Accès à B (via UUID) → autorisé car agency_id match
  const resultB = assertAgencyAccess(ctx, 'uuid-agency-B');
  assertEquals(resultB.allowed, true);
  
  // Accès à A (via UUID) → refusé malgré le slug 'agence-a'
  const resultA = assertAgencyAccess(ctx, 'uuid-agency-A');
  assertEquals(resultA.allowed, false);
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Rôle franchiseur → accès global (bypass agency_id check)
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: franchisor role grants global access', () => {
  const ctx = makeContext({
    agencyId: 'uuid-agency-A',
    globalRoleLevel: GLOBAL_ROLES.franchisor_user,
  });
  const result = assertAgencyAccess(ctx, 'uuid-agency-OTHER');
  assertEquals(result.allowed, true);
});

// ═══════════════════════════════════════════════════════════════════════
// 5. agency_id null → aucun accès agence
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: null agency_id denies all agency access', () => {
  const ctx = makeContext({ agencyId: null });
  const result = assertAgencyAccess(ctx, 'uuid-agency-A');
  assertEquals(result.allowed, false);
});

// ═══════════════════════════════════════════════════════════════════════
// 6. Le slug est utilisé uniquement pour les URL Apogée (non pour l'authz)
// ═══════════════════════════════════════════════════════════════════════
Deno.test('assertAgencyAccess: slug not used in UUID-based access check', () => {
  // Même si slug match, agency_id mismatch → refusé
  const ctx = makeContext({
    agencyId: 'uuid-WRONG',
    agencySlug: 'agence-target',
  });
  // assertAgencyAccess prend un UUID, pas un slug
  const result = assertAgencyAccess(ctx, 'uuid-agency-TARGET');
  assertEquals(result.allowed, false);
});
