import { describe, it, expect } from 'vitest';
import { computeConfidenceBreakdown } from '../confidence';
import type { WorkItem } from '../types';

function makeItem(source: WorkItem['durationSource']): WorkItem {
  return {
    id: 'test',
    source: 'visite',
    start: new Date(),
    end: new Date(),
    durationMinutes: 60,
    durationSource: source,
    technicians: ['t1'],
    category: 'productive',
    isSav: false,
  };
}

describe('computeConfidenceBreakdown', () => {
  it('returns 1.0 for all explicit durations with contract', () => {
    const result = computeConfidenceBreakdown({
      workItems: [makeItem('explicit'), makeItem('computed')],
      capacityConfidence: 1.0,
      matchAmbiguousCount: 0,
      matchTotalCount: 2,
      classificationFallbackCount: 0,
      classificationTotalCount: 2,
    });
    expect(result.durationConfidence).toBe(1);
    expect(result.capacityConfidence).toBe(1);
    expect(result.matchingConfidence).toBe(1);
    expect(result.classificationConfidence).toBe(1);
    expect(result.globalConfidenceScore).toBe(1);
  });

  it('returns lower score with fallback durations', () => {
    const result = computeConfidenceBreakdown({
      workItems: [makeItem('explicit'), makeItem('business_default')],
      capacityConfidence: 0.5,
      matchAmbiguousCount: 1,
      matchTotalCount: 2,
      classificationFallbackCount: 1,
      classificationTotalCount: 2,
    });
    expect(result.durationConfidence).toBe(0.5);
    expect(result.globalConfidenceScore).toBeLessThan(1);
    expect(result.globalConfidenceScore).toBeGreaterThan(0);
  });

  it('handles empty work items', () => {
    const result = computeConfidenceBreakdown({
      workItems: [],
      capacityConfidence: 0.5,
      matchAmbiguousCount: 0,
      matchTotalCount: 0,
      classificationFallbackCount: 0,
      classificationTotalCount: 0,
    });
    expect(result.durationConfidence).toBe(0);
    expect(result.globalConfidenceScore).toBeGreaterThanOrEqual(0);
  });
});
