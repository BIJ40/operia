/**
 * Non-regression tests for backup helpers extracted in Phase 3.
 * Validates that extractPlainText, cleanHtmlForExport, todayISO
 * preserve exact behavior from the original use-admin-backup.ts.
 */
import { describe, it, expect } from 'vitest';
import { extractPlainText, cleanHtmlForExport, todayISO } from '@/lib/backup-helpers';

describe('backup-helpers', () => {
  describe('extractPlainText', () => {
    it('returns empty string for empty input', () => {
      expect(extractPlainText('')).toBe('');
    });

    it('strips HTML tags and returns text content', () => {
      expect(extractPlainText('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('handles nested elements', () => {
      expect(extractPlainText('<div><ul><li>Item 1</li><li>Item 2</li></ul></div>')).toBe('Item 1Item 2');
    });

    it('handles entities', () => {
      expect(extractPlainText('&amp; &lt; &gt;')).toBe('& < >');
    });
  });

  describe('cleanHtmlForExport', () => {
    it('returns empty string for empty input', () => {
      expect(cleanHtmlForExport('')).toBe('');
    });

    it('removes non-allowed attributes', () => {
      const result = cleanHtmlForExport('<p class="foo" style="color:red" id="bar">Text</p>');
      expect(result).not.toContain('class=');
      expect(result).not.toContain('style=');
      expect(result).not.toContain('id=');
      expect(result).toContain('Text');
    });

    it('keeps href, src, alt, title attributes', () => {
      const result = cleanHtmlForExport('<a href="https://test.com" title="link" class="x">Link</a>');
      expect(result).toContain('href="https://test.com"');
      expect(result).toContain('title="link"');
      expect(result).not.toContain('class=');
    });

    it('preserves nested structure', () => {
      const result = cleanHtmlForExport('<div><img src="a.png" alt="img" data-id="1"/></div>');
      expect(result).toContain('src="a.png"');
      expect(result).toContain('alt="img"');
      expect(result).not.toContain('data-id');
    });
  });

  describe('todayISO', () => {
    it('returns a valid YYYY-MM-DD format', () => {
      const result = todayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
