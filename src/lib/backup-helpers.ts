/**
 * Pure helper functions for admin backup operations.
 * Extracted from use-admin-backup.ts — no behavioral change.
 */

/** Strip HTML tags and return plain text */
export function extractPlainText(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/** Clean HTML for export: keep only href, src, alt, title attributes */
export function cleanHtmlForExport(html: string): string {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const cleanElement = (element: Element) => {
    const attributesToKeep = ['href', 'src', 'alt', 'title'];
    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
      if (!attributesToKeep.includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
    Array.from(element.children).forEach(child => cleanElement(child));
  };

  cleanElement(temp);
  return temp.innerHTML.replace(/></g, '>\n<').replace(/\n\s*\n/g, '\n').trim();
}

/** Trigger a file download in the browser */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Today's date formatted for filenames (YYYY-MM-DD) */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
