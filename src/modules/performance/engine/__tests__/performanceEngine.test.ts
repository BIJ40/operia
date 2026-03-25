import { describe, it, expect } from 'vitest';
import { computeTechnicianSnapshots } from '../performanceEngine';
import type { PerformanceEngineInput, WorkItem, TechnicianInput } from '../types';
import { DEFAULT_THRESHOLDS } from '../rules';

function makeInput(overrides: Partial<PerformanceEngineInput> = {}): PerformanceEngineInput {
  const techs = new Map<string, TechnicianInput>();
  techs.set('t1', { id: 't1', name: 'Jean Dupont', weeklyHours: 35, isKnown: true });

  return {
    workItems: [],
    technicians: techs,
    absences: new Map(),
    config: DEFAULT_THRESHOLDS,
    period: { start: new Date('2025-01-06'), end: new Date('2025-01-10') },
    ...overrides,
  };
}

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'w1',
    source: 'visite',
    start: new Date('2025-01-07T08:00:00Z'),
    end: new Date('2025-01-07T10:00:00Z'),
    durationMinutes: 120,
    durationSource: 'explicit',
    technicians: ['t1'],
    category: 'productive',
    isSav: false,
    ...overrides,
  };
}

describe('computeTechnicianSnapshots', () => {
  it('produces snapshot for tech with work items', () => {
    const input = makeInput({
      workItems: [makeWorkItem()],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots.length).toBe(1);
    expect(result.snapshots[0].workload.productive).toBe(120);
    expect(result.snapshots[0].productivityRatio).toBe(1);
  });

  it('handles no activity (NO_ACTIVITY warning)', () => {
    const input = makeInput();
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].calculationTrace.warnings).toContain('NO_ACTIVITY');
    expect(result.snapshots[0].workload.total).toBe(0);
  });

  it('handles unknown technician (team_only policy)', () => {
    const input = makeInput({
      workItems: [makeWorkItem({ technicians: ['unknown_tech'] })],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.unknownTechnicianWorkload).toBe(120);
    // t1 still in snapshots with 0 workload
    expect(result.snapshots.find(s => s.technicianId === 't1')?.workload.total).toBe(0);
  });

  it('splits duration between multi-tech items', () => {
    const techs = new Map<string, TechnicianInput>();
    techs.set('t1', { id: 't1', name: 'Tech 1', weeklyHours: 35, isKnown: true });
    techs.set('t2', { id: 't2', name: 'Tech 2', weeklyHours: 35, isKnown: true });

    const input = makeInput({
      technicians: techs,
      workItems: [makeWorkItem({ technicians: ['t1', 't2'], durationMinutes: 120 })],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots.find(s => s.technicianId === 't1')?.workload.productive).toBe(60);
    expect(result.snapshots.find(s => s.technicianId === 't2')?.workload.productive).toBe(60);
  });

  it('caGenerated is always null', () => {
    const input = makeInput({ workItems: [makeWorkItem()] });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].caGenerated).toBeNull();
    expect(result.snapshots[0].caAvailability).toBe('not_available');
  });

  it('loadRatio is null when capacity is 0 (weekend-only period)', () => {
    const input = makeInput({
      period: { start: new Date('2025-01-11'), end: new Date('2025-01-12') }, // Sat-Sun
      workItems: [makeWorkItem()],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].loadRatio).toBeNull();
    expect(result.snapshots[0].calculationTrace.warnings).toContain('ZERO_WORKING_DAYS');
  });

  it('flags MISSING_CONTRACT for default weekly hours', () => {
    const techs = new Map<string, TechnicianInput>();
    techs.set('t1', { id: 't1', name: 'Tech 1', isKnown: true }); // no weeklyHours
    const input = makeInput({ technicians: techs, workItems: [makeWorkItem()] });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].dataQualityFlags.missingContract).toBe(true);
    expect(result.snapshots[0].calculationTrace.warnings).toContain('MISSING_CONTRACT');
  });

  it('flags HIGH_FALLBACK_USAGE when most durations are defaults', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makeWorkItem({ id: `w${i}`, durationSource: 'business_default' })
    );
    const input = makeInput({ workItems: items });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].dataQualityFlags.highFallbackUsage).toBe(true);
  });

  it('classifies SAV items correctly', () => {
    const input = makeInput({
      workItems: [
        makeWorkItem({ category: 'productive', isSav: false }),
        makeWorkItem({ id: 'w2', category: 'sav', isSav: true, interventionId: 'sav1' }),
      ],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots[0].savCount).toBe(1);
    expect(result.snapshots[0].workload.sav).toBe(120);
  });

  it('excludes absent techs from team averages', () => {
    const techs = new Map<string, TechnicianInput>();
    techs.set('t1', { id: 't1', name: 'Tech 1', weeklyHours: 35, isKnown: true });
    techs.set('t2', { id: 't2', name: 'Tech 2', weeklyHours: 35, isKnown: true });

    const absences = new Map();
    absences.set('t2', { technicianId: 't2', source: 'planning_unavailability' as const, label: 'En congé', days: 5 });

    const input = makeInput({
      technicians: techs,
      absences,
      workItems: [
        makeWorkItem({ technicians: ['t1'], durationMinutes: 120 }),
      ],
    });
    const result = computeTechnicianSnapshots(input);
    expect(result.snapshots.find(s => s.technicianId === 't2')?.isAbsent).toBe(true);
    // Team average should only consider t1
    expect(result.teamStats.avgProductivityRate).toBe(1);
  });

  it('does not mark a technician absent for a partial absence in the period', () => {
    const absences = new Map();
    absences.set('t1', {
      technicianId: 't1',
      source: 'planning_unavailability' as const,
      label: 'En congé',
      days: 1,
    });

    const result = computeTechnicianSnapshots(makeInput({ absences }));
    expect(result.snapshots[0].isAbsent).toBe(false);
    expect(result.snapshots[0].capacity.reportedAbsenceDays).toBe(1);
  });
});
