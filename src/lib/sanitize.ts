import DOMPurify from 'dompurify';

const ALLOWED_DATA_ATTRIBUTES = new Set([
  'data-callout',
  'data-callout-type',
  'data-image-button',
  'data-image-modal',
  'data-src',
  'data-label',
]);

const URI_DATA_ATTRIBUTES = new Set([
  'data-image-modal',
  'data-src',
]);

function isAllowedDataAttributeValue(attributeName: string, value: string): boolean {
  if (!URI_DATA_ATTRIBUTES.has(attributeName)) return true;

  return (
    value.startsWith('data:image/') ||
    value.startsWith('blob:') ||
    value.startsWith('/') ||
    /^https?:\/\//i.test(value)
  );
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML elements and attributes for rich text content
 * 
 * Security hardening (Phase 1):
 * - `style` attribute REMOVED (CSS injection vector)
 * - data-* attrs are post-filtered manually to keep only the explicit allowlist
 * - URL-like data attrs are limited to image/blob/http(s)/relative sources
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return html;
  }
  
  const sanitizedFragment = DOMPurify.sanitize(html, {
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
    // Preserve explicit data-* attrs, then strip anything not allowlisted below.
    ALLOW_DATA_ATTR: true,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment;

  const container = document.createElement('div');
  container.appendChild(sanitizedFragment);

  container.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if (!attribute.name.startsWith('data-')) return;

      if (!ALLOWED_DATA_ATTRIBUTES.has(attribute.name)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (!isAllowedDataAttributeValue(attribute.name, attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return container.innerHTML;
}

/**
 * Create sanitized HTML props for dangerouslySetInnerHTML
 */
export function createSanitizedHtml(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}
