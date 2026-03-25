import { describe, it, expect } from 'vitest';
import { scoreWorkItemSimilarity, shouldMergeWorkItems, mergeWorkItems, normalizeWorkItemDates } from '../matching';
import type { WorkItem } from '../types';

function makeItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-1',
    source: 'visite',
    start: new Date('2025-01-10T08:00:00Z'),
    end: new Date('2025-01-10T10:00:00Z'),
    durationMinutes: 120,
    durationSource: 'explicit',
    technicians: ['t1'],
    category: 'productive',
    isSav: false,
    ...overrides,
  };
}

describe('scoreWorkItemSimilarity', () => {
  it('returns 1.0 for identical items', () => {
    const a = makeItem({ interventionId: 'i1', projectId: 'p1' });
    const b = makeItem({ id: 'test-2', interventionId: 'i1', projectId: 'p1' });
    expect(scoreWorkItemSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it('returns 0.4 for same interventionId only', () => {
    const a = makeItem({ interventionId: 'i1', start: new Date('2025-01-10T08:00:00Z'), end: new Date('2025-01-10T09:00:00Z'), technicians: ['t1'] });
    const b = makeItem({ id: 'b', interventionId: 'i1', start: new Date('2025-01-11T08:00:00Z'), end: new Date('2025-01-11T09:00:00Z'), technicians: ['t2'] });
    const score = scoreWorkItemSimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  it('returns low score for unrelated items', () => {
    const a = makeItem({ interventionId: 'i1', start: new Date('2025-01-10T08:00:00Z'), end: new Date('2025-01-10T09:00:00Z'), technicians: ['t1'] });
    const b = makeItem({ id: 'b', interventionId: 'i2', start: new Date('2025-01-11T14:00:00Z'), end: new Date('2025-01-11T15:00:00Z'), technicians: ['t2'], projectId: 'p2' });
    const score = scoreWorkItemSimilarity(a, b);
    expect(score).toBeLessThan(0.3);
  });

  it('partially overlapping slots score > 0', () => {
    const a = makeItem({ start: new Date('2025-01-10T08:00:00Z'), end: new Date('2025-01-10T10:00:00Z') });
    const b = makeItem({ id: 'b', source: 'planning', start: new Date('2025-01-10T09:00:00Z'), end: new Date('2025-01-10T11:00:00Z') });
    const score = scoreWorkItemSimilarity(a, b);
    expect(score).toBeGreaterThan(0);
  });
});

describe('shouldMergeWorkItems', () => {
  it('merges items with high similarity', () => {
    const a = makeItem({ interventionId: 'i1', projectId: 'p1' });
    const b = makeItem({ id: 'b', source: 'planning', interventionId: 'i1', projectId: 'p1' });
    expect(shouldMergeWorkItems(a, b)).toBe(true);
  });

  it('does not merge unrelated items', () => {
    const a = makeItem({ interventionId: 'i1' });
    const b = makeItem({ id: 'b', interventionId: 'i2', start: new Date('2025-01-11T14:00:00Z'), end: new Date('2025-01-11T15:00:00Z'), technicians: ['t2'] });
    expect(shouldMergeWorkItems(a, b)).toBe(false);
  });
});

describe('mergeWorkItems', () => {
  it('prioritizes visite over planning', () => {
    const visite = makeItem({ source: 'visite', durationMinutes: 90, durationSource: 'explicit' });
    const planning = makeItem({ id: 'b', source: 'planning', durationMinutes: 60, durationSource: 'planning', technicians: ['t2'] });
    const merged = mergeWorkItems(visite, planning);
    expect(merged.durationMinutes).toBe(90);
    expect(merged.technicians).toContain('t1');
    expect(merged.technicians).toContain('t2');
  });
});

describe('normalizeWorkItemDates', () => {
  it('computes end from duration when end is missing', () => {
    const item = makeItem({ end: new Date(0) });
    const normalized = normalizeWorkItemDates(item);
    expect(normalized.end.getTime()).toBe(item.start.getTime() + 120 * 60000);
  });
});
