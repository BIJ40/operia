import { describe, it, expect } from 'vitest';
import { buildUnifiedWorkItems } from '../consolidation';

describe('buildUnifiedWorkItems', () => {
  const period = { start: new Date('2025-01-06'), end: new Date('2025-01-10') };
  const projectsById = new Map<string, Record<string, unknown>>();

  it('extracts items from intervention visites', () => {
    const interventions = [{
      id: 1,
      projectId: 10,
      type: 'travaux',
      data: {
        visites: [{
          date: '2025-01-07T08:00:00',
          usersIds: [100],
          duree: 120,
          type: 'travaux',
        }],
      },
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, [], projectsById, period, 60);
    expect(result.items.length).toBe(1);
    expect(result.items[0].durationMinutes).toBe(120);
    expect(result.items[0].source).toBe('visite');
  });

  it('falls back to creneaux when no visites', () => {
    const creneaux = [{
      id: 1,
      date: '2025-01-07T08:00:00',
      duree: 90,
      usersIds: [100],
      interventionId: 1,
    }] as unknown as Record<string, unknown>[];

    const interventions = [{
      id: 1,
      projectId: 10,
      type: 'depannage',
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, creneaux, projectsById, period, 60);
    expect(result.items.length).toBe(1);
    expect(result.items[0].source).toBe('planning');
  });

  it('merges matching visite and creneau', () => {
    const interventions = [{
      id: 1,
      projectId: 10,
      type: 'travaux',
      data: {
        visites: [{
          date: '2025-01-07T08:00:00',
          usersIds: [100],
          duree: 120,
          type: 'travaux',
        }],
      },
    }] as unknown as Record<string, unknown>[];

    const creneaux = [{
      id: 1,
      date: '2025-01-07T08:00:00',
      duree: 90,
      usersIds: [100],
      interventionId: 1,
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, creneaux, projectsById, period, 60);
    // Should merge → only 1 item (visite takes priority)
    expect(result.items.length).toBe(1);
    expect(result.matchLog.some(m => m.outcome === 'merged')).toBe(true);
  });

  it('keeps separate unrelated items', () => {
    const interventions = [{
      id: 1, projectId: 10, type: 'travaux',
      data: { visites: [{ date: '2025-01-07T08:00:00', usersIds: [100], duree: 120 }] },
    }] as unknown as Record<string, unknown>[];

    const creneaux = [{
      id: 2, date: '2025-01-09T14:00:00', duree: 60, usersIds: [200], interventionId: 99,
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, creneaux, projectsById, period, 60);
    expect(result.items.length).toBe(2);
  });

  it('filters out-of-period items', () => {
    const interventions = [{
      id: 1, type: 'travaux',
      data: { visites: [{ date: '2024-12-01T08:00:00', usersIds: [100], duree: 60 }] },
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, [], projectsById, period, 60);
    expect(result.items.length).toBe(0);
  });

  it('handles intervention without visites', () => {
    const interventions = [{
      id: 1, projectId: 10, type: 'depannage',
      date: '2025-01-08T09:00:00', userId: 100, duree: 90,
    }] as unknown as Record<string, unknown>[];

    const result = buildUnifiedWorkItems(interventions, [], projectsById, period, 60);
    expect(result.items.length).toBe(1);
    expect(result.items[0].source).toBe('intervention');
  });
});
