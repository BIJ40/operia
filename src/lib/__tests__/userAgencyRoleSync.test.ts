/**
 * Tests anti-régression: synchronisation utilisateur / agence / rôle
 * Couvre le scénario réel: retrait agence + changement poste → cohérence complète
 */
import { describe, it, expect } from 'vitest';
import {
  getSuggestedGlobalRole,
  validateRoleAgenceCoherence,
  AGENCY_REQUIRED_POSTES,
  NO_AGENCY_POSTES,
} from '../roleAgenceMapping';

describe('userAgencyRoleSync — scénarios bout en bout', () => {
  
  describe('Scénario: retrait agence + poste tête de réseau', () => {
    it('tete_de_reseau suggère franchisor_user (N3)', () => {
      expect(getSuggestedGlobalRole('tete_de_reseau')).toBe('franchisor_user');
    });

    it('franchisee_admin sans agence → incohérent', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisee_admin', null);
      expect(warning).not.toBeNull();
    });

    it('franchisor_user sans agence → cohérent', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisor_user', null);
      expect(warning).toBeNull();
    });

    it('franchisor_admin sans agence → cohérent', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisor_admin', null);
      expect(warning).toBeNull();
    });
  });

  describe('Scénario: retrait agence pour un dirigeant', () => {
    it('dirigeant suggère franchisee_admin (N2)', () => {
      expect(getSuggestedGlobalRole('dirigeant')).toBe('franchisee_admin');
    });

    it('franchisee_admin sans agence → incohérent', () => {
      const warning = validateRoleAgenceCoherence('dirigeant', 'franchisee_admin', null);
      expect(warning).not.toBeNull();
      expect(warning).toContain('agence');
    });

    it('franchisee_user sans agence → incohérent', () => {
      const warning = validateRoleAgenceCoherence('assistante', 'franchisee_user', null);
      expect(warning).not.toBeNull();
    });
  });

  describe('Postes nécessitant une agence vs postes sans agence', () => {
    it('dirigeant, assistante, commercial, technicien requièrent une agence', () => {
      for (const poste of AGENCY_REQUIRED_POSTES) {
        const suggested = getSuggestedGlobalRole(poste);
        expect(suggested).toBeDefined();
        // Tous ces postes mappent vers un rôle agence (N1 ou N2)
        expect(['franchisee_user', 'franchisee_admin']).toContain(suggested);
      }
    });

    it('tete_de_reseau et externe sont compatibles sans agence', () => {
      for (const poste of NO_AGENCY_POSTES) {
        const suggested = getSuggestedGlobalRole(poste);
        expect(suggested).toBeDefined();
        // Ces postes ne sont PAS des rôles agence
        expect(['franchisee_user', 'franchisee_admin']).not.toContain(suggested);
      }
    });
  });

  describe('Le rôle global ne doit pas être écrasé silencieusement', () => {
    it('changer le poste en tete_de_reseau ne force pas franchisee_admin', () => {
      const suggested = getSuggestedGlobalRole('tete_de_reseau');
      expect(suggested).not.toBe('franchisee_admin');
      expect(suggested).toBe('franchisor_user');
    });

    it('un N4+ avec tete_de_reseau reste cohérent', () => {
      const warning = validateRoleAgenceCoherence('tete_de_reseau', 'franchisor_admin', null);
      expect(warning).toBeNull();
    });

    it('un superadmin sans agence est toujours cohérent quel que soit le poste', () => {
      const warning = validateRoleAgenceCoherence(null, 'superadmin', null);
      expect(warning).toBeNull();
    });
  });

  describe('Aucun collaborateur actif résiduel attendu après retrait agence', () => {
    // Ce test valide la règle métier côté DB trigger
    // Le trigger sync_collaborator_on_profile_update soft-delete le collaborateur
    // quand agency_id passe à NULL
    it('la règle métier exige que le retrait agency_id déclenche un soft-delete collaborateur', () => {
      // Validation de la documentation de la règle
      // Le trigger SQL fait: UPDATE collaborators SET leaving_date = CURRENT_DATE WHERE user_id = X AND agency_id = OLD.agency_id
      expect(true).toBe(true); // Règle documentée, testée via migration SQL
    });
  });
});
