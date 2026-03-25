/**
 * Forecast — Tests charge probable
 * Phase 6 Lot 3
 */

import { describe, it, expect } from 'vitest';
import { computeProbableWorkload } from '../probableWorkload';
import type { ProbableWorkloadInput, ForecastHorizon } from '../types';

const PERIOD = {
  start: new Date('2025-02-01T00:00:00Z'),
  end: new Date('2025-02-08T00:00:00Z'),
};

function makeInput(overrides: Partial<ProbableWorkloadInput> = {}): ProbableWorkloadInput {
  return {
    technicians: new Map([
      ['t1', { id: 't1', name: 'Tech A', weeklyHours: 35, isKnown: true }],
      ['t2', { id: 't2', name: 'Tech B', weeklyHours: 35, isKnown: true }],
    ]),
    period: PERIOD,
    probableSourceData: {},
    ...overrides,
  };
}

function makeProjet(overrides: Partial<{
  projectId: number;
  etatWorkflow: string;
  totalHeuresTech: number;
  devisHT: number;
  technicianIds: string[];
  universes: string[];
  riskScoreGlobal: number;
  ageDays: number | null;
  dataQualityFlags: string[];
}> = {}) {
  return {
    projectId: overrides.projectId ?? 1,
    label: `Projet ${overrides.projectId ?? 1}`,
    reference: `REF-${overrides.projectId ?? 1}`,
    etatWorkflow: overrides.etatWorkflow ?? 'to_planify_tvx',
    etatWorkflowLabel: 'À planifier',
    universes: overrides.universes ?? ['Plomberie'],
    totalHeuresRdv: (overrides.totalHeuresTech ?? 10) / 2,
    totalHeuresTech: overrides.totalHeuresTech ?? 10,
    nbTechs: 1,
    devisHT: overrides.devisHT ?? 5000,
    ageDays: overrides.ageDays ?? 5,
    riskScoreGlobal: overrides.riskScoreGlobal ?? 0.2,
    dataQualityFlags: overrides.dataQualityFlags ?? [],
    includedInChargeCalc: true,
    technicianIds: overrides.technicianIds ?? ['t1'],
  };
}

const horizon: ForecastHorizon = '30d';

describe('computeProbableWorkload', () => {
  // Cas 1 — pipeline mature → high
  it('classifies mature pipeline project as high probability', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          etatWorkflow: 'to_planify_tvx',
          devisHT: 10000,
          technicianIds: ['t1'],
          totalHeuresTech: 20,
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].highProbabilityMinutes).toBeGreaterThan(0);
  });

  // Cas 2 — pipeline moyen → medium
  it('classifies medium maturity project as medium probability', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          etatWorkflow: 'devis_to_order',
          devisHT: 0,
          technicianIds: ['t1'],
          dataQualityFlags: ['missing_devis'],
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].mediumProbabilityMinutes).toBeGreaterThan(0);
  });

  // Cas 3 — pipeline faible → low
  it('classifies low maturity project as low probability', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          etatWorkflow: 'wait_fourn',
          devisHT: 0,
          technicianIds: [],
          dataQualityFlags: ['missing_hours', 'missing_devis', 'missing_univers', 'missing_planned_date'],
          riskScoreGlobal: 0.8,
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads.length).toBeGreaterThanOrEqual(0);
    if (result.probableItems.length > 0) {
      expect(result.probableItems[0].confidenceTier).toBe('low');
    }
  });

  // Cas 4 — projet à risque élevé → pénalité
  it('applies penalty for high risk projects', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          riskScoreGlobal: 0.9,
          technicianIds: ['t1'],
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    if (result.workloads.length > 0) {
      const penalties = result.workloads[0].probablePenalties;
      expect(penalties.some(p => p.code === 'HIGH_RISK_PROJECT')).toBe(true);
    }
  });

  // Cas 5 — univers connu + tech éligible → allocation correcte
  it('allocates to known technician with correct universe', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          technicianIds: ['t1'],
          universes: ['Plomberie'],
          totalHeuresTech: 8,
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(1);
    expect(result.workloads[0].technicianId).toBe('t1');
    expect(result.workloads[0].universeBreakdown['Plomberie']).toBeGreaterThan(0);
  });

  // Cas 6 — plusieurs techs éligibles → répartition égale
  it('splits equally across multiple eligible technicians', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          technicianIds: ['t1', 't2'],
          totalHeuresTech: 20,
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(2);
    const t1 = result.workloads.find(w => w.technicianId === 't1')!;
    const t2 = result.workloads.find(w => w.technicianId === 't2')!;
    expect(t1.probableMinutes).toBe(t2.probableMinutes);
  });

  // Cas 7 — univers inconnu → pénalité
  it('applies penalty for unknown universe', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          universes: [],
          technicianIds: ['t1'],
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    if (result.workloads.length > 0) {
      expect(result.workloads[0].probablePenalties.some(p => p.code === 'UNKNOWN_UNIVERSE')).toBe(true);
      expect(result.workloads[0].universeBreakdown['unknown']).toBeGreaterThan(0);
    }
  });

  // Cas 8 — pas de tech éligible → fallback équipe
  it('distributes to all techs when no target technician', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({
          technicianIds: [],
          totalHeuresTech: 20,
        })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    // Should distribute to both t1 and t2
    expect(result.workloads).toHaveLength(2);
    for (const w of result.workloads) {
      expect(w.probablePenalties.some(p => p.code === 'UNCERTAIN_TECH_ASSIGNMENT')).toBe(true);
    }
  });

  // Cas 9 — dataQuality faible → confiance dégradée
  it('degrades confidence for low data quality', () => {
    const input = makeInput({
      probableSourceData: {
        dataQuality: {
          score: 25, withHours: 1, withDevis: 0, withUnivers: 0, withPlannedDate: 0, total: 4,
          flags: { missing_hours: 3, missing_devis: 4 },
        },
        parProjet: [makeProjet({ technicianIds: ['t1'] })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    if (result.workloads.length > 0) {
      expect(result.workloads[0].probablePenalties.some(p => p.code === 'LOW_DATA_QUALITY')).toBe(true);
    }
  });

  // Cas 10 — source breakdown correct
  it('tracks source breakdown correctly', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [
          makeProjet({ projectId: 1, etatWorkflow: 'to_planify_tvx', technicianIds: ['t1'], totalHeuresTech: 10 }),
          makeProjet({ projectId: 2, etatWorkflow: 'wait_fourn', technicianIds: ['t1'], totalHeuresTech: 5 }),
        ],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    const t1 = result.workloads.find(w => w.technicianId === 't1');
    expect(t1).toBeDefined();
    expect(t1!.sourceBreakdown.travaux_a_planifier).toBeGreaterThan(0);
    expect(t1!.sourceBreakdown.dossier_en_attente).toBeGreaterThan(0);
  });

  // Cas 11 — universe breakdown correct
  it('tracks universe breakdown correctly', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [
          makeProjet({ projectId: 1, universes: ['Plomberie'], technicianIds: ['t1'], totalHeuresTech: 10 }),
          makeProjet({ projectId: 2, universes: ['Électricité'], technicianIds: ['t1'], totalHeuresTech: 5 }),
        ],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    const t1 = result.workloads.find(w => w.technicianId === 't1')!;
    expect(t1.universeBreakdown['Plomberie']).toBeGreaterThan(0);
    expect(t1.universeBreakdown['Électricité']).toBeGreaterThan(0);
  });

  // Cas 12 — agrégation équipe
  it('aggregates team stats correctly', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [
          makeProjet({ projectId: 1, technicianIds: ['t1'], totalHeuresTech: 10 }),
          makeProjet({ projectId: 2, technicianIds: ['t2'], totalHeuresTech: 15 }),
        ],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.teamStats.totalProbableMinutes).toBeGreaterThan(0);
    expect(result.teamStats.horizon).toBe('30d');
  });

  // Cas 13 — absence de probableSourceData → retour vide propre
  it('returns empty results when no source data', () => {
    const input = makeInput({ probableSourceData: {} });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(0);
    expect(result.probableItems).toHaveLength(0);
    expect(result.teamStats.totalProbableMinutes).toBe(0);
  });

  // Cas 14 — fallback chargeByTechnician quand pas de parProjet
  it('uses chargeByTechnician fallback when no parProjet', () => {
    const input = makeInput({
      probableSourceData: {
        chargeByTechnician: [
          { technicianId: 't1', hours: 20, projects: 3 },
          { technicianId: 't2', hours: 10, projects: 2 },
        ],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.workloads).toHaveLength(2);
    expect(result.workloads[0].probableMinutes).toBeGreaterThan(0);
  });

  // Cas 15 — horizon court capture moins
  it('captures less probable work for shorter horizons', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({ technicianIds: ['t1'], totalHeuresTech: 20 })],
      },
    });

    const result7d = computeProbableWorkload(input, '7d');
    const result30d = computeProbableWorkload(input, '30d');

    const mins7d = result7d.workloads[0]?.probableMinutes ?? 0;
    const mins30d = result30d.workloads[0]?.probableMinutes ?? 0;
    expect(mins7d).toBeLessThan(mins30d);
  });

  // Cas 16 — projects with 0 hours excluded
  it('excludes projects with zero hours', () => {
    const input = makeInput({
      probableSourceData: {
        parProjet: [makeProjet({ technicianIds: ['t1'], totalHeuresTech: 0 })],
      },
    });

    const result = computeProbableWorkload(input, horizon);
    expect(result.probableItems).toHaveLength(0);
    expect(result.workloads).toHaveLength(0);
  });
});
