/**
 * Non-regression tests for ticket-detail constants extracted in Phase 3.
 * Validates that AUTHOR_COLORS, ORIGINE_OPTIONS, formatTicketRef
 * preserve exact behavior from the original TicketDetailDrawer.tsx.
 */
import { describe, it, expect } from 'vitest';
import { AUTHOR_COLORS, ORIGINE_OPTIONS, MAX_VISIBLE_COMMENTS, formatTicketRef } from '@/apogee-tickets/components/ticket-detail/constants';

describe('ticket-detail constants', () => {
  it('AUTHOR_COLORS has HC and APOGEE keys', () => {
    expect(AUTHOR_COLORS).toHaveProperty('HC');
    expect(AUTHOR_COLORS).toHaveProperty('APOGEE');
    expect(Object.keys(AUTHOR_COLORS)).toHaveLength(2);
  });

  it('ORIGINE_OPTIONS has expected shape', () => {
    expect(ORIGINE_OPTIONS.length).toBeGreaterThanOrEqual(7);
    ORIGINE_OPTIONS.forEach(opt => {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
    });
  });

  it('ORIGINE_OPTIONS includes JEROME and AUTRE', () => {
    const values = ORIGINE_OPTIONS.map(o => o.value);
    expect(values).toContain('JEROME');
    expect(values).toContain('AUTRE');
  });

  it('MAX_VISIBLE_COMMENTS is 3', () => {
    expect(MAX_VISIBLE_COMMENTS).toBe(3);
  });

  describe('formatTicketRef', () => {
    it('formats ticket number with zero-padding', () => {
      expect(formatTicketRef(1)).toBe('APO-001');
      expect(formatTicketRef(42)).toBe('APO-042');
      expect(formatTicketRef(999)).toBe('APO-999');
    });

    it('handles undefined', () => {
      expect(formatTicketRef(undefined)).toBe('APO-000');
    });
  });
});
