import { describe, it, expect } from 'vitest';
import { resolveDuration } from '../duration';

describe('resolveDuration', () => {
  it('uses explicit duration first', () => {
    const result = resolveDuration({ duration: 90, heureDebut: '08:00', heureFin: '10:00' });
    expect(result.minutes).toBe(90);
    expect(result.source).toBe('explicit');
  });

  it('uses dureeMinutes if no duration', () => {
    const result = resolveDuration({ dureeMinutes: 45 });
    expect(result.minutes).toBe(45);
    expect(result.source).toBe('explicit');
  });

  it('computes from start/end', () => {
    const result = resolveDuration({
      start: new Date('2025-01-10T08:00:00'),
      end: new Date('2025-01-10T10:30:00'),
    });
    expect(result.minutes).toBe(150);
    expect(result.source).toBe('computed');
  });

  it('computes from heureDebut/heureFin', () => {
    const result = resolveDuration({
      heureDebut: '08:00',
      heureFin: '09:30',
    });
    expect(result.minutes).toBe(90);
    expect(result.source).toBe('computed');
  });

  it('uses planning duration as fallback', () => {
    const result = resolveDuration({ planningDuree: 120 });
    expect(result.minutes).toBe(120);
    expect(result.source).toBe('planning');
  });

  it('falls back to business_default when nothing available', () => {
    const result = resolveDuration({});
    expect(result.minutes).toBe(60);
    expect(result.source).toBe('business_default');
  });

  it('flags aberrant duration (>720min)', () => {
    const result = resolveDuration({ duration: 800 });
    expect(result.isAberrant).toBe(true);
    expect(result.minutes).toBe(60); // fallback to default
  });

  it('flags negative duration', () => {
    const result = resolveDuration({
      start: new Date('2025-01-10T10:00:00'),
      end: new Date('2025-01-10T08:00:00'),
    });
    // negative diff → goes to next level
    expect(result.source).toBe('business_default');
  });

  it('respects custom default duration', () => {
    const result = resolveDuration({}, 90);
    expect(result.minutes).toBe(90);
    expect(result.source).toBe('business_default');
  });
});
