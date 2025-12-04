/**
 * Search utilities for Help Academy
 * P1-05: Full-text search in content
 */

/**
 * Strip HTML tags from content
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  // Use regex for server-side compatibility (no DOMParser)
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search in blocks content (title + sections content)
 */
export function searchInBlocks<T extends { id: string; title: string; content?: string; parentId?: string | null }>(
  blocks: T[],
  categories: T[],
  searchTerm: string
): T[] {
  if (!searchTerm.trim()) return categories;
  
  const searchLower = searchTerm.toLowerCase();
  
  return categories.filter(cat => {
    // Match category title
    if (cat.title.toLowerCase().includes(searchLower)) return true;
    
    // Match section titles
    const sections = blocks.filter(b => b.parentId === cat.id);
    if (sections.some(s => s.title.toLowerCase().includes(searchLower))) return true;
    
    // Match section content (full-text)
    if (sections.some(s => {
      const plainText = stripHtml(s.content || '');
      return plainText.toLowerCase().includes(searchLower);
    })) return true;
    
    return false;
  });
}
