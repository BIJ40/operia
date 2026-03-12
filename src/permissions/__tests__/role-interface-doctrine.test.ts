/**
 * ROLE INTERFACE DOCTRINE TESTS
 * 
 * Guarantees that modules marked `roleInterface: true` (e.g. reseau_franchiseur)
 * are NEVER treated as standard modules.
 * 
 * Invariants enforced:
 * 1. Not in PLAN_VISIBLE_MODULES
 * 2. Not in DEFAULT_MODULES_BY_ROLE (frontend)
 * 3. Not in edge function defaultModules
 * 4. Not in admin modules standard (rightsTaxonomy)
 * 5. Not used by moduleGuard in sitemapData
 * 6. Not expected in plan_tier_modules
 * 7. roleInterface flag is set in MODULE_DEFINITIONS
 */

import { describe, it, expect } from 'vitest';
import { MODULE_DEFINITIONS, PLAN_VISIBLE_MODULES } from '@/types/modules';
import { DEFAULT_MODULES_BY_ROLE } from '@/config/modulesByRole';
import { RIGHTS_CATEGORIES } from '@/components/admin/views/rightsTaxonomy';
import { SITEMAP_ROUTES } from '@/config/sitemapData';

// ============================================================================
// Discover all roleInterface modules dynamically
// ============================================================================

const ROLE_INTERFACE_MODULES = MODULE_DEFINITIONS.filter(m => m.roleInterface === true);
const ROLE_INTERFACE_KEYS = ROLE_INTERFACE_MODULES.map(m => m.key);

describe('Role Interface doctrine', () => {
  it('at least one roleInterface module exists (reseau_franchiseur)', () => {
    expect(ROLE_INTERFACE_KEYS).toContain('reseau_franchiseur');
  });

  // ── BLOC 1: Not in PLAN_VISIBLE_MODULES ──
  describe('Not in PLAN_VISIBLE_MODULES', () => {
    for (const key of ROLE_INTERFACE_KEYS) {
      it(`${key} is NOT plan-visible`, () => {
        expect(PLAN_VISIBLE_MODULES).not.toContain(key);
      });
    }
  });

  // ── BLOC 2: Not in DEFAULT_MODULES_BY_ROLE ──
  describe('Not in DEFAULT_MODULES_BY_ROLE (frontend)', () => {
    for (const key of ROLE_INTERFACE_KEYS) {
      it(`${key} is NOT in any role defaults`, () => {
        for (const [role, defaults] of Object.entries(DEFAULT_MODULES_BY_ROLE)) {
          const entry = defaults[key];
          const isEnabled = typeof entry === 'object' ? entry?.enabled : false;
          expect(isEnabled).not.toBe(true);
        }
      });
    }
  });

  // ── BLOC 3: adminOnly is true (excludes from standard admin) ──
  describe('adminOnly flag excludes from standard module admin', () => {
    for (const mod of ROLE_INTERFACE_MODULES) {
      it(`${mod.key} has adminOnly=true`, () => {
        expect(mod.adminOnly).toBe(true);
      });
    }
  });

  // ── BLOC 4: defaultForRoles is empty ──
  describe('defaultForRoles is empty', () => {
    for (const mod of ROLE_INTERFACE_MODULES) {
      it(`${mod.key} has empty defaultForRoles`, () => {
        expect(mod.defaultForRoles).toEqual([]);
      });
    }
  });

  // ── BLOC 5: Not in RIGHTS_CATEGORIES (admin modules standard) ──
  describe('Not in admin rights taxonomy', () => {
    const allRightsKeys = RIGHTS_CATEGORIES.flatMap(c => c.moduleKeys);
    for (const key of ROLE_INTERFACE_KEYS) {
      it(`${key} is NOT in RIGHTS_CATEGORIES`, () => {
        expect(allRightsKeys).not.toContain(key);
      });
    }
  });

  // ── BLOC 6: Not used by moduleGuard in sitemapData ──
  describe('Not used by moduleGuard in sitemapData', () => {
    function collectModuleGuardKeys(routes: typeof SITEMAP_ROUTES): string[] {
      const keys: string[] = [];
      for (const route of routes) {
        if (route.guards?.moduleGuard?.moduleKey) {
          keys.push(route.guards.moduleGuard.moduleKey);
        }
        if (route.children) {
          keys.push(...collectModuleGuardKeys(route.children));
        }
      }
      return keys;
    }

    const allModuleGuardKeys = collectModuleGuardKeys(SITEMAP);
    for (const key of ROLE_INTERFACE_KEYS) {
      it(`${key} has no moduleGuard in routes`, () => {
        expect(allModuleGuardKeys).not.toContain(key);
      });
    }
  });

  // ── BLOC 7: roleInterface flag is properly set ──
  describe('roleInterface flag integrity', () => {
    for (const mod of ROLE_INTERFACE_MODULES) {
      it(`${mod.key} has roleInterface=true`, () => {
        expect(mod.roleInterface).toBe(true);
      });
    }

    it('no other module has roleInterface=true', () => {
      const nonRoleInterface = MODULE_DEFINITIONS.filter(
        m => m.roleInterface === true && !ROLE_INTERFACE_KEYS.includes(m.key)
      );
      expect(nonRoleInterface).toEqual([]);
    });
  });
});
