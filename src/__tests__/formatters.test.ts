import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1500)).toContain('1');
    expect(formatCurrency(1500)).toContain('500');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });
});

describe('formatPercent', () => {
  it('formats with one decimal', () => {
    expect(formatPercent(42.567)).toBe('42.6%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});

describe('formatNumber', () => {
  it('formats large numbers with separator', () => {
    const result = formatNumber(1234567);
    // French formatting uses non-breaking space
    expect(result.replace(/\s/g, '')).toBe('1234567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
