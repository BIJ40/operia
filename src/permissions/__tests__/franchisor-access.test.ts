import { describe, it, expect } from 'vitest';
import {
  canAccessFranchisorInterface,
  canAccessFranchisorSection,
  getAccessibleSections,
} from '../franchisorAccess';

describe('Franchisor Interface Access (role-based, not module-based)', () => {
  // ── Test 1: N2 refusé ──
  it('N2 (franchisee_admin) cannot access franchisor interface', () => {
    expect(canAccessFranchisorInterface('franchisee_admin')).toBe(false);
  });

  it('N1 (franchisee_user) cannot access franchisor interface', () => {
    expect(canAccessFranchisorInterface('franchisee_user')).toBe(false);
  });

  it('N0 (base_user) cannot access franchisor interface', () => {
    expect(canAccessFranchisorInterface('base_user')).toBe(false);
  });

  it('null role cannot access franchisor interface', () => {
    expect(canAccessFranchisorInterface(null)).toBe(false);
  });

  // ── Test 2: N3 autorisé ──
  it('N3 (franchisor_user) can access franchisor interface', () => {
    expect(canAccessFranchisorInterface('franchisor_user')).toBe(true);
  });

  // ── Test 3: N3 ne peut PAS accéder aux redevances ──
  it('N3 (franchisor_user) cannot access redevances', () => {
    expect(canAccessFranchisorSection('franchisor_user', 'redevances')).toBe(false);
  });

  it('N3 (franchisor_user) can access dashboard', () => {
    expect(canAccessFranchisorSection('franchisor_user', 'dashboard')).toBe(true);
  });

  it('N3 (franchisor_user) can access stats', () => {
    expect(canAccessFranchisorSection('franchisor_user', 'stats')).toBe(true);
  });

  it('N3 (franchisor_user) can access agences', () => {
    expect(canAccessFranchisorSection('franchisor_user', 'agences')).toBe(true);
  });

  // ── Test 4: N4 peut accéder aux redevances ──
  it('N4 (franchisor_admin) can access redevances', () => {
    expect(canAccessFranchisorSection('franchisor_admin', 'redevances')).toBe(true);
  });

  it('N4 (franchisor_admin) can access all sections', () => {
    const sections = getAccessibleSections('franchisor_admin');
    expect(sections).toContain('dashboard');
    expect(sections).toContain('stats');
    expect(sections).toContain('agences');
    expect(sections).toContain('comparatifs');
    expect(sections).toContain('redevances');
  });

  // ── Test 5: N5+ accès total ──
  it('N5 (platform_admin) can access all sections', () => {
    const sections = getAccessibleSections('platform_admin');
    expect(sections).toContain('redevances');
    expect(sections.length).toBe(7);
  });

  it('N6 (superadmin) can access all sections', () => {
    const sections = getAccessibleSections('superadmin');
    expect(sections).toContain('redevances');
    expect(sections.length).toBe(7);
  });

  // ── Test 7: pas d'overwrite nécessaire pour N3/N4 ──
  it('N3 access does NOT depend on module enablement', () => {
    // The function only takes role, no module check
    expect(canAccessFranchisorInterface('franchisor_user')).toBe(true);
  });

  it('N4 access does NOT depend on module enablement', () => {
    expect(canAccessFranchisorInterface('franchisor_admin')).toBe(true);
  });

  // ── Test: N2 cannot access any section ──
  it('N2 gets zero accessible sections', () => {
    expect(getAccessibleSections('franchisee_admin')).toEqual([]);
  });
});
