import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML elements and attributes for rich text content
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
      'class', 'style', 'type', 'disabled',
      'data-callout', 'data-callout-type',
      'data-image-modal', 'data-src',
      'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: true,
  });
}

/**
 * Create sanitized HTML props for dangerouslySetInnerHTML
 */
export function createSanitizedHtml(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}
