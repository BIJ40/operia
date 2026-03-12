/**
 * PERMISSIONS ENGINE — Tests unitaires
 * Vérifie le moteur de permissions V2.0
 * Phase 8: Migré vers clés hiérarchiques
 */

import { describe, it, expect } from 'vitest';
import {
  hasAccess,
  hasMinRole,
  getRoleLevel,
  isBypassRole,
  getEffectiveModules,
  validateUserPermissions,
  getUserManagementCapabilities,
} from '../permissionsEngine';
import type { PermissionContext, HasAccessParams } from '../types';
import type { GlobalRole } from '@/types/globalRoles';

// ============================================================================
// hasMinRole
// ============================================================================

describe('hasMinRole', () => {
  it('returns false for null role', () => {
    expect(hasMinRole(null, 'base_user')).toBe(false);
  });

  it('returns true when role >= minRole', () => {
    expect(hasMinRole('franchisee_admin', 'franchisee_user')).toBe(true);
    expect(hasMinRole('superadmin', 'platform_admin')).toBe(true);
  });

  it('returns false when role < minRole', () => {
    expect(hasMinRole('base_user', 'franchisee_user')).toBe(false);
    expect(hasMinRole('franchisee_user', 'franchisor_user')).toBe(false);
  });

  it('returns true when role === minRole', () => {
    expect(hasMinRole('franchisee_admin', 'franchisee_admin')).toBe(true);
  });
});

// ============================================================================
// getRoleLevel
// ============================================================================

describe('getRoleLevel', () => {
  it('returns 0 for null', () => {
    expect(getRoleLevel(null)).toBe(0);
  });

  it('returns correct levels', () => {
    expect(getRoleLevel('base_user')).toBe(0);
    expect(getRoleLevel('franchisee_user')).toBe(1);
    expect(getRoleLevel('franchisee_admin')).toBe(2);
    expect(getRoleLevel('franchisor_user')).toBe(3);
    expect(getRoleLevel('franchisor_admin')).toBe(4);
    expect(getRoleLevel('platform_admin')).toBe(5);
    expect(getRoleLevel('superadmin')).toBe(6);
  });
});

// ============================================================================
// isBypassRole
// ============================================================================

describe('isBypassRole', () => {
  it('returns false for null', () => {
    expect(isBypassRole(null)).toBe(false);
  });

  it('returns true for N5+ roles', () => {
    expect(isBypassRole('platform_admin')).toBe(true);
    expect(isBypassRole('superadmin')).toBe(true);
  });

  it('returns false for N0-N4 roles', () => {
    expect(isBypassRole('base_user')).toBe(false);
    expect(isBypassRole('franchisee_admin')).toBe(false);
    expect(isBypassRole('franchisor_admin')).toBe(false);
  });
});

// ============================================================================
// hasAccess
// ============================================================================

describe('hasAccess', () => {
  const baseCtx: PermissionContext = {
    globalRole: 'franchisee_admin',
    enabledModules: {
      'pilotage.agence': { enabled: true, options: { indicateurs: true, actions_a_mener: true } },
      'organisation.salaries': { enabled: true, options: { rh_viewer: true, rh_admin: false } },
    },
    agencyId: 'agency-1',
  };

  it('bypass: superadmin accesses everything', () => {
    const params: HasAccessParams = {
      globalRole: 'superadmin',
      enabledModules: null,
      agencyId: null,
      moduleId: 'admin_plateforme',
    };
    expect(hasAccess(params)).toBe(true);
  });

  it('bypass: platform_admin accesses everything', () => {
    const params: HasAccessParams = {
      globalRole: 'platform_admin',
      enabledModules: null,
      agencyId: null,
      moduleId: 'reseau_franchiseur',
    };
    expect(hasAccess(params)).toBe(true);
  });

  it('denies access when role below module min', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      globalRole: 'base_user',
      moduleId: 'pilotage.agence', // minRole = franchisee_admin
    };
    expect(hasAccess(params)).toBe(false);
  });

  it('denies access to agency module without agency', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      agencyId: null,
      moduleId: 'pilotage.agence',
    };
    expect(hasAccess(params)).toBe(false);
  });

  it('denies network module for non-network role', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      moduleId: 'reseau_franchiseur',
    };
    expect(hasAccess(params)).toBe(false);
  });

  it('allows network module for franchisor_user', () => {
    const params: HasAccessParams = {
      globalRole: 'franchisor_user',
      enabledModules: {
        reseau_franchiseur: { enabled: true, options: { dashboard: true } },
      },
      agencyId: null,
      moduleId: 'reseau_franchiseur',
    };
    expect(hasAccess(params)).toBe(true);
  });

  it('grants access when module explicitly enabled', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      moduleId: 'pilotage.agence',
    };
    expect(hasAccess(params)).toBe(true);
  });

  it('checks specific option — enabled', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      moduleId: 'organisation.salaries',
      optionId: 'rh_viewer',
    };
    expect(hasAccess(params)).toBe(true);
  });

  it('checks specific option — disabled', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      moduleId: 'organisation.salaries',
      optionId: 'rh_admin',
    };
    expect(hasAccess(params)).toBe(false);
  });

  it('denies when module not in enabledModules', () => {
    const params: HasAccessParams = {
      ...baseCtx,
      moduleId: 'ticketing',
    };
    const result = hasAccess(params);
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// getEffectiveModules
// ============================================================================

describe('getEffectiveModules', () => {
  it('returns all modules enabled for superadmin', () => {
    const result = getEffectiveModules({
      globalRole: 'superadmin',
      enabledModules: null,
      agencyId: null,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(m => m.enabled)).toBe(true);
    expect(result.every(m => m.source === 'bypass')).toBe(true);
  });

  it('bypass N5+ includes RPC keys not in MODULE_DEFINITIONS', () => {
    const result = getEffectiveModules({
      globalRole: 'superadmin',
      enabledModules: {
        'some.unknown.key' as any: { enabled: true, options: { foo: true } },
      },
      agencyId: null,
    });
    const unknown = result.find(m => m.id === 'some.unknown.key');
    expect(unknown).toBeDefined();
    expect(unknown?.enabled).toBe(true);
    expect(unknown?.source).toBe('bypass');
    expect(unknown?.options?.foo).toBe(true);
  });

  it('disables agency modules when no agency', () => {
    const result = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'pilotage.agence': { enabled: true, options: {} },
      },
      agencyId: null,
    });
    const agenceModule = result.find(m => m.id === 'pilotage.agence');
    expect(agenceModule?.enabled).toBe(false);
  });

  it('uses explicit modules over defaults', () => {
    const result = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'support.guides': { enabled: true, options: { apogee: true, faq: false } },
      },
      agencyId: 'agency-1',
    });
    const guidesModule = result.find(m => m.id === 'support.guides');
    expect(guidesModule?.enabled).toBe(true);
    expect(guidesModule?.source).toBe('explicit');
    expect(guidesModule?.options?.apogee).toBe(true);
    expect(guidesModule?.options?.faq).toBe(false);
  });

  it('RPC key unknown to MODULE_DEFINITIONS is visible to hasAccess', () => {
    const unknownKey = 'custom.new_feature' as any;
    const result = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        [unknownKey]: { enabled: true, options: { beta: true } },
      },
      agencyId: 'agency-1',
    });
    const found = result.find(m => m.id === unknownKey);
    expect(found).toBeDefined();
    expect(found?.enabled).toBe(true);
    expect(found?.source).toBe('explicit');
    expect(found?.options?.beta).toBe(true);
  });

  it('complements with DEFAULT_MODULES_BY_ROLE for missing keys', () => {
    const result = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'support.guides': { enabled: true, options: { apogee: true } },
      },
      agencyId: 'agency-1',
    });
    // support.guides comes from RPC (explicit)
    const guides = result.find(m => m.id === 'support.guides');
    expect(guides?.source).toBe('explicit');
    // pilotage.agence should come from defaults (franchisee_admin has it)
    const agence = result.find(m => m.id === 'pilotage.agence');
    expect(agence).toBeDefined();
    expect(agence?.source).toBe('default');
  });

  it('does NOT override RPC key with DEFAULT_MODULES_BY_ROLE', () => {
    const result = getEffectiveModules({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'support.guides': { enabled: false, options: {} },
      },
      agencyId: 'agency-1',
    });
    const guides = result.find(m => m.id === 'support.guides');
    expect(guides?.enabled).toBe(false);
    expect(guides?.source).toBe('explicit');
  });
});

// ============================================================================
// validateUserPermissions
// ============================================================================

describe('validateUserPermissions', () => {
  it('returns error for agency role without agency', () => {
    const issues = validateUserPermissions({
      globalRole: 'franchisee_user',
      enabledModules: null,
      agencyId: null,
    });
    expect(issues.some(i => i.code === 'AGENCY_ROLE_NO_AGENCY')).toBe(true);
  });

  it('returns warning when no modules configured', () => {
    const issues = validateUserPermissions({
      globalRole: 'franchisee_admin',
      enabledModules: null,
      agencyId: 'agency-1',
    });
    expect(issues.some(i => i.code === 'NO_EXPLICIT_MODULES')).toBe(true);
  });

  it('returns no errors for valid config', () => {
    const issues = validateUserPermissions({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'pilotage.agence': { enabled: true, options: {} },
      },
      agencyId: 'agency-1',
    });
    const errors = issues.filter(i => i.type === 'error');
    expect(errors.length).toBe(0);
  });

  it('detects support level without agent option', () => {
    const issues = validateUserPermissions({
      globalRole: 'franchisee_admin',
      enabledModules: {
        'support.aide_en_ligne': { enabled: true, options: { user: true, agent: false } },
      },
      agencyId: 'agency-1',
      supportLevel: 2,
    });
    expect(issues.some(i => i.code === 'SUPPORT_LEVEL_NO_AGENT')).toBe(true);
  });
});

// ============================================================================
// getUserManagementCapabilities
// ============================================================================

describe('getUserManagementCapabilities', () => {
  it('returns no capabilities for null role', () => {
    const caps = getUserManagementCapabilities(null);
    expect(caps.viewScope).toBe('none');
    expect(caps.canCreateRoles).toEqual([]);
  });

  it('base_user can only view self', () => {
    const caps = getUserManagementCapabilities('base_user');
    expect(caps.viewScope).toBe('self');
    expect(caps.manageScope).toBe('none');
    expect(caps.canCreateRoles).toEqual([]);
  });

  it('franchisee_admin manages own agency', () => {
    const caps = getUserManagementCapabilities('franchisee_admin');
    expect(caps.viewScope).toBe('ownAgency');
    expect(caps.manageScope).toBe('ownAgency');
    expect(caps.canCreateRoles).toContain('base_user');
    expect(caps.canCreateRoles).toContain('franchisee_user');
    expect(caps.canCreateRoles).not.toContain('franchisee_admin');
  });

  it('superadmin can create up to platform_admin', () => {
    const caps = getUserManagementCapabilities('superadmin');
    expect(caps.viewScope).toBe('allAgencies');
    expect(caps.canDeleteUsers).toBe(true);
    expect(caps.canCreateRoles).toContain('platform_admin');
    expect(caps.canCreateRoles).not.toContain('superadmin');
  });

  it('roles cannot create their own level', () => {
    const roles: GlobalRole[] = ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'];
    for (const role of roles) {
      const caps = getUserManagementCapabilities(role);
      expect(caps.canCreateRoles).not.toContain(role);
    }
  });
});
