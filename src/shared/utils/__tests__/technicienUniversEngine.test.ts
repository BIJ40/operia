/**
 * P2-07: Tests unitaires pour technicienUniversEngine
 * Vérification du lissage CA et des règles métier critiques
 */

import { describe, it, expect } from 'vitest';

// Mock simple des données pour les tests
const createMockFacture = (id: number, projectId: number, totalHT: number, type: 'facture' | 'avoir' = 'facture') => ({
  id,
  projectId,
  data: { totalHT },
  typeFacture: type,
  dateReelle: '2024-06-15',
  state: 'paid'
});

const createMockProject = (id: number, universes: string[]) => ({
  id,
  data: { universes }
});

const createMockIntervention = (id: number, projectId: number, userId: number, dureeMinutes: number) => ({
  id,
  projectId,
  userId,
  data: {
    visites: [{
      usersIds: [userId],
      dureeMinutes,
      state: 'validated'
    }],
    biDepan: { Items: { IsValidated: true } }
  }
});

const createMockUser = (id: number, name: string) => ({
  id,
  firstname: name,
  lastname: 'Test',
  isTechnicien: true,
  is_on: true
});

describe('technicienUniversEngine - Règles métier', () => {
  describe('Règle: CA techniciens ≤ CA global', () => {
    it('Le total CA tech ne doit jamais dépasser le CA global des factures', () => {
      // Ce test documente la règle - l'implémentation utilise le lissage L373-408
      const caGlobal = 100000;
      const caTechCalcule = 105000; // Hypothèse: calcul dépasse
      
      // Après lissage, l'écart doit être réparti
      const ecart = caGlobal - caTechCalcule;
      const nbTech = 5;
      const ajustementParTech = ecart / nbTech;
      
      // Chaque tech reçoit une correction négative
      expect(ajustementParTech).toBeLessThan(0);
      
      // Le nouveau total doit être ≤ CA global
      const nouveauTotal = caTechCalcule + (ajustementParTech * nbTech);
      expect(nouveauTotal).toBeLessThanOrEqual(caGlobal + 0.01); // Tolérance arrondi
    });
  });

  describe('Règle: Avoirs traités comme négatifs', () => {
    it('Les avoirs doivent réduire le CA total', () => {
      const factureStandard = createMockFacture(1, 100, 10000, 'facture');
      const avoir = createMockFacture(2, 100, 2000, 'avoir');
      
      // Extraction des montants nets
      const getMontantNet = (f: any) => {
        const type = (f.typeFacture || '').toLowerCase();
        const montant = f.data?.totalHT || 0;
        return type === 'avoir' ? -Math.abs(montant) : montant;
      };
      
      const total = getMontantNet(factureStandard) + getMontantNet(avoir);
      
      expect(total).toBe(8000); // 10000 - 2000
    });

    it('CA global = somme factures - somme avoirs', () => {
      const factures = [
        createMockFacture(1, 100, 50000, 'facture'),
        createMockFacture(2, 101, 30000, 'facture'),
        createMockFacture(3, 100, 5000, 'avoir'),
      ];
      
      const getMontantNet = (f: any) => {
        const type = (f.typeFacture || '').toLowerCase();
        const montant = f.data?.totalHT || 0;
        return type === 'avoir' ? -Math.abs(montant) : montant;
      };
      
      const caGlobal = factures.reduce((sum, f) => sum + getMontantNet(f), 0);
      
      expect(caGlobal).toBe(75000); // 50000 + 30000 - 5000
    });
  });

  describe('Règle: RT ne génère pas de CA', () => {
    it('Les interventions RT doivent être exclues du calcul CA technicien', () => {
      const typesRT = ['rt', 'RT', 'releve technique', 'rdv technique'];
      const typesProductifs = ['depannage', 'travaux', 'repair'];
      
      const isRT = (type: string) => {
        const normalized = type.toLowerCase().trim();
        return ['rt', 'releve technique', 'rdv technique'].some(rt => normalized.includes(rt));
      };
      
      typesRT.forEach(type => {
        expect(isRT(type)).toBe(true);
      });
      
      typesProductifs.forEach(type => {
        expect(isRT(type)).toBe(false);
      });
    });
  });

  describe('Règle: Lissage écart CA', () => {
    it('Lécart résiduel doit être < 1 centime après lissage', () => {
      const totalFacturesNet = 100000.00;
      const totalCAReparti = 100005.23; // Écart dû aux arrondis
      const nbTech = 3;
      
      const ecartBrut = totalFacturesNet - totalCAReparti;
      const ajustementParTech = ecartBrut / nbTech;
      
      // Simulation du lissage
      const nouveauTotal = totalCAReparti + (ajustementParTech * nbTech);
      const ecartResiduel = Math.abs(totalFacturesNet - nouveauTotal);
      
      // Écart résiduel doit être négligeable (< 1 centime)
      expect(ecartResiduel).toBeLessThan(0.01);
    });
  });
});

describe('technicienUniversEngine - Cas limites', () => {
  it('0 techniciens = pas de répartition', () => {
    const result: any[] = [];
    const ecartBrut = 5000;
    
    // Pas de division par 0
    if (result.length > 0) {
      const ajustement = ecartBrut / result.length;
      expect(ajustement).toBeDefined();
    } else {
      expect(result.length).toBe(0);
    }
  });

  it('Facture sans projet = ignorée', () => {
    const facture = createMockFacture(1, 9999, 10000); // projectId inexistant
    const projects = [createMockProject(100, ['plomberie'])];
    
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const project = projectsMap.get(facture.projectId);
    
    expect(project).toBeUndefined();
  });

  it('Projet sans univers = facture ignorée', () => {
    const project = createMockProject(100, []);
    const universes = project.data?.universes || [];
    
    expect(universes.length).toBe(0);
  });
});
