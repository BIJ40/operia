// Types pour la table apogee_guides (moteur RAG)

export interface ApogeeGuide {
  id: string;
  titre: string;
  categorie: string;
  section: string;
  texte: string;
  version: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApogeeGuideInsert {
  titre: string;
  categorie: string;
  section: string;
  texte: string;
  version?: string;
  tags?: string | null;
}

export interface ApogeeGuideUpdate {
  titre?: string;
  categorie?: string;
  section?: string;
  texte?: string;
  version?: string;
  tags?: string | null;
}

// Helper pour parser les tags
export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

// Helper pour formatter les tags
export function formatTags(tags: string[]): string {
  return tags.join(', ');
}
