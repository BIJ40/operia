/**
 * Tests: globalRoles — hierarchy, comparison, labels
 */
import { describe, it, expect } from 'vitest';
import {
  GLOBAL_ROLES,
  GLOBAL_ROLE_LABELS,
  GLOBAL_ROLE_DESCRIPTIONS,
  hasMinimumRole,
  getRoleLevel,
  compareRoles,
  getAllRolesSorted,
} from '@/types/globalRoles';

// ============================================================================
// GLOBAL_ROLES constants
// ============================================================================

describe('GLOBAL_ROLES constants', () => {
  it('has 7 roles defined', () => {
    expect(Object.keys(GLOBAL_ROLES)).toHaveLength(7);
  });

  it('levels are monotonically increasing', () => {
    const levels = Object.values(GLOBAL_ROLES);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  it('base_user is level 0', () => {
    expect(GLOBAL_ROLES.base_user).toBe(0);
  });

  it('superadmin is highest level', () => {
    const maxLevel = Math.max(...Object.values(GLOBAL_ROLES));
    expect(GLOBAL_ROLES.superadmin).toBe(maxLevel);
  });

  it('all roles have labels', () => {
    for (const role of Object.keys(GLOBAL_ROLES)) {
      expect(GLOBAL_ROLE_LABELS[role as keyof typeof GLOBAL_ROLES]).toBeDefined();
      expect(GLOBAL_ROLE_LABELS[role as keyof typeof GLOBAL_ROLES].length).toBeGreaterThan(0);
    }
  });

  it('all roles have descriptions', () => {
    for (const role of Object.keys(GLOBAL_ROLES)) {
      expect(GLOBAL_ROLE_DESCRIPTIONS[role as keyof typeof GLOBAL_ROLES]).toBeDefined();
    }
  });
});

// ============================================================================
// hasMinimumRole
// ============================================================================

describe('hasMinimumRole', () => {
  it('returns false for null', () => {
    expect(hasMinimumRole(null, 'base_user')).toBe(false);
  });

  it('same role passes', () => {
    expect(hasMinimumRole('franchisee_admin', 'franchisee_admin')).toBe(true);
  });

  it('higher role passes', () => {
    expect(hasMinimumRole('superadmin', 'base_user')).toBe(true);
  });

  it('lower role fails', () => {
    expect(hasMinimumRole('base_user', 'franchisee_admin')).toBe(false);
  });

  it('franchisee_user cannot access franchisee_admin features', () => {
    expect(hasMinimumRole('franchisee_user', 'franchisee_admin')).toBe(false);
  });

  it('platform_admin can access everything except superadmin', () => {
    expect(hasMinimumRole('platform_admin', 'franchisor_admin')).toBe(true);
    expect(hasMinimumRole('platform_admin', 'superadmin')).toBe(false);
  });
});

// ============================================================================
// getRoleLevel
// ============================================================================

describe('getRoleLevel', () => {
  it('returns 0 for null', () => {
    expect(getRoleLevel(null)).toBe(0);
  });

  it('returns correct level for each role', () => {
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
// compareRoles
// ============================================================================

describe('compareRoles', () => {
  it('returns 0 for same role', () => {
    expect(compareRoles('franchisee_admin', 'franchisee_admin')).toBe(0);
  });

  it('returns positive when A > B', () => {
    expect(compareRoles('superadmin', 'base_user')).toBeGreaterThan(0);
  });

  it('returns negative when A < B', () => {
    expect(compareRoles('base_user', 'superadmin')).toBeLessThan(0);
  });

  it('handles null roles', () => {
    expect(compareRoles(null, 'base_user')).toBe(0); // both 0
    expect(compareRoles('franchisee_user', null)).toBe(1); // 1 - 0
  });
});

// ============================================================================
// getAllRolesSorted
// ============================================================================

describe('getAllRolesSorted', () => {
  it('returns all roles', () => {
    const sorted = getAllRolesSorted();
    expect(sorted).toHaveLength(7);
  });

  it('is sorted ascending', () => {
    const sorted = getAllRolesSorted();
    expect(sorted[0]).toBe('base_user');
    expect(sorted[sorted.length - 1]).toBe('superadmin');
  });

  it('maintains hierarchy order', () => {
    const sorted = getAllRolesSorted();
    for (let i = 1; i < sorted.length; i++) {
      expect(GLOBAL_ROLES[sorted[i]]).toBeGreaterThan(GLOBAL_ROLES[sorted[i - 1]]);
    }
  });
});
