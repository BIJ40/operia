/**
 * Tests anti-régression: cohérence role_agence / global_role / agence
 */
import { describe, it, expect } from 'vitest';
import {
  getSuggestedGlobalRole,
  validateRoleAgenceCoherence,
  ROLE_AGENCE_TO_GLOBAL_ROLE,
} from '../roleAgenceMapping';

describe('roleAgenceMapping', () => {
  describe('getSuggestedGlobalRole', () => {
    it('dirigeant → franchisee_admin', () => {
      expect(getSuggestedGlobalRole('dirigeant')).toBe('franchisee_admin');
    });

    it('tete_de_reseau → franchisor_user', () => {
      expect(getSuggestedGlobalRole('tete_de_reseau')).toBe('franchisor_user');
    });

    it('assistante → franchisee_user', () => {
      expect(getSuggestedGlobalRole('assistante')).toBe('franchisee_user');
    });

    it('commercial → franchisee_user', () => {
      expect(getSuggestedGlobalRole('commercial')).toBe('franchisee_user');
    });

    it('externe → base_user', () => {
      expect(getSuggestedGlobalRole('externe')).toBe('base_user');
    });

    it('null → null', () => {
      expect(getSuggestedGlobalRole(null)).toBeNull();
    });

    it('unknown → null', () => {
      expect(getSuggestedGlobalRole('unknown_role')).toBeNull();
    });
  });

  describe('validateRoleAgenceCoherence', () => {
    // BUG ORIGINAL: franchisee_admin sans agence = incohérent
    it('franchisee_admin sans agence → avertissement', () => {
      const warning = validateRoleAgenceCoherence('dirigeant', 'franchisee_admin', null);
      expect(warning).not.toBeNull();
      expect(warning).toContain('agence');
    });

    it('franchisee_user sans agence → avertissement', () => {
      const warning = validateRoleAgenceCoherence('assistante', 'franchisee_user', null);
      expect(warning).not.toBeNull();
    });

    // BUG ORIGINAL: tete_de_reseau + franchisee_admin = incohérent
    it('tete_de_reseau avec franchisee_admin → avertissement', () => {
      // With agency so rule 1 doesn't fire first
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisee_admin', 'agence-test');
      expect(warning).not.toBeNull();
      expect(warning).toContain('N3');
    });

    it('tete_de_reseau avec franchisor_user → OK', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisor_user', null);
      expect(warning).toBeNull();
    });

    it('dirigeant avec agence et franchisee_admin → OK', () => {
      const warning = validateRoleAgenceCoherence('dirigeant', 'franchisee_admin', 'agence-test');
      expect(warning).toBeNull();
    });

    // N4+ franchiseur sans agence → OK (pas un rôle agence)
    it('franchisor_admin sans agence → OK', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisor_admin', null);
      expect(warning).toBeNull();
    });

    it('superadmin sans agence → OK', () => {
      const warning = validateRoleAgenceCoherence(null, 'superadmin', null);
      expect(warning).toBeNull();
    });

    // N5+ avec n'importe quoi → OK
    it('platform_admin → pas de warning', () => {
      const warning = validateRoleAgenceCoherence('externe', 'platform_admin', null);
      expect(warning).toBeNull();
    });
  });

  describe('mapping exhaustivité', () => {
    it('tous les postes standards ont un mapping', () => {
      const postes = ['dirigeant', 'assistante', 'commercial', 'tete_de_reseau', 'externe'];
      for (const p of postes) {
        expect(ROLE_AGENCE_TO_GLOBAL_ROLE[p]).toBeDefined();
      }
    });
  });
});
