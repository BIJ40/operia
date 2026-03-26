import { describe, it, expect } from 'vitest';
import { allocateDuration } from '../allocation';

describe('allocateDuration', () => {
  it('allocates full duration to single tech', () => {
    const result = allocateDuration(120, ['t1']);
    expect(result.allocations.get('t1')).toBe(120);
    expect(result.sharedSlots).toBe(0);
  });

  it('splits equally between 2 techs', () => {
    const result = allocateDuration(120, ['t1', 't2']);
    expect(result.allocations.get('t1')).toBe(60);
    expect(result.allocations.get('t2')).toBe(60);
    expect(result.sharedSlots).toBe(1);
  });

  it('splits equally between 3 techs', () => {
    const result = allocateDuration(120, ['t1', 't2', 't3']);
    expect(result.allocations.get('t1')).toBe(40);
    expect(result.allocations.get('t2')).toBe(40);
    expect(result.allocations.get('t3')).toBe(40);
  });

  it('handles empty tech list', () => {
    const result = allocateDuration(120, []);
    expect(result.allocations.size).toBe(0);
    expect(result.sharedSlots).toBe(0);
  });

  it('method is always equal_split', () => {
    const result = allocateDuration(100, ['t1', 't2']);
    expect(result.method).toBe('equal_split');
  });
});
