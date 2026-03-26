import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML elements and attributes for rich text content
 * 
 * Security hardening (Phase 1):
 * - `style` attribute REMOVED (CSS injection vector)
 * - `ALLOW_DATA_ATTR` set to false; only explicit data-* attrs allowed
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return html;
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img', 'button',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
      'hr',
      'sub', 'sup',
      'section',
      'figure', 'figcaption',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'title', 'width', 'height',
      'class', 'type', 'disabled',
      // Explicit data attributes used by the app (no wildcard)
      'data-callout', 'data-callout-type',
      'data-image-button', 'data-image-modal', 'data-src', 'data-label',
      'colspan', 'rowspan',
    ],
    // Disable wildcard data-* to prevent attribute injection
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Create sanitized HTML props for dangerouslySetInnerHTML
 */
export function createSanitizedHtml(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}
