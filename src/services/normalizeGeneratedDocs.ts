/**
 * Normalisation des generatedDocs — Documents PDF générés par Apogée
 * 
 * RÈGLES:
 * - generatedDocs est TOUJOURS traité comme optionnel/nullable/partiel
 * - L'absence de documents ne provoque JAMAIS d'erreur
 * - Les liens PDF ne sont affichés que si leur URL est réellement exploitable
 * - Distinguer: disponible / référencé mais non consultable / absent
 */

import type { ApogeeGeneratedDoc, ApogeeGeneratedDocsResponse } from '@/apogee-connect/types/generatedDocs';

// =============================================================================
// TYPES
// =============================================================================

export type DocStatus = 'available' | 'referenced_unavailable' | 'absent';

export interface NormalizedDoc {
  id: string;
  category: 'factures' | 'devis' | 'interventions' | 'projects';
  categoryLabel: string;
  fileName: string;
  docLabel: string;
  url: string | null;
  status: DocStatus;
  date: string | null;
  nbPages: number | null;
  size: number | null;
  isSignature: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  factures: 'Factures',
  deviss: 'Devis',
  interventions: "Rapports d'intervention",
  projects: 'Documents projet',
};

// Map API keys to normalized category keys
const CATEGORY_MAP: Record<string, NormalizedDoc['category']> = {
  factures: 'factures',
  deviss: 'devis',
  interventions: 'interventions',
  projects: 'projects',
};

// =============================================================================
// NORMALIZER
// =============================================================================

/**
 * Normalise generatedDocs en liste unifiée, typée, triée par date.
 * 
 * @param raw - La propriété generatedDocs du projet (peut être null, undefined, malformée)
 * @returns Liste normalisée de documents, jamais null
 */
export function normalizeGeneratedDocs(raw: unknown): NormalizedDoc[] {
  if (!raw || typeof raw !== 'object') return [];

  const docs: NormalizedDoc[] = [];
  const response = raw as Partial<ApogeeGeneratedDocsResponse>;

  for (const [apiKey, category] of Object.entries(CATEGORY_MAP)) {
    const docArrays = (response as any)?.[apiKey === 'devis' ? 'deviss' : apiKey];
    if (!Array.isArray(docArrays)) continue;

    for (const group of docArrays) {
      const items = Array.isArray(group) ? group : [group];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;

        const doc = item as Partial<ApogeeGeneratedDoc>;
        const url = doc.url && typeof doc.url === 'string' ? doc.url.trim() : null;

        // Déterminer le statut du document
        let status: DocStatus = 'absent';
        if (url && isUrlExploitable(url)) {
          status = 'available';
        } else if (url || doc.id) {
          status = 'referenced_unavailable';
        }

        docs.push({
          id: String(doc.id || `${apiKey}-${docs.length}`),
          category,
          categoryLabel: CATEGORY_LABELS[apiKey] || apiKey,
          fileName: doc.fileName || 'Document',
          docLabel: doc.data?.docLabel || doc.fileName || 'Document',
          url: status === 'available' ? url : null,
          status,
          date: doc.created_at || null,
          nbPages: doc.data?.nbPages ?? null,
          size: doc.data?.size ?? null,
          isSignature: doc.data?.isSignature ?? false,
        });
      }
    }
  }

  // Dédupliquer par id (l'API Apogée peut renvoyer des doublons dans les groupes)
  const seen = new Set<string>();
  const uniqueDocs = docs.filter(d => {
    // Pour les IDs générés (fallback), on garde tout
    if (d.id.includes('-')) return true;
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  // Tri par date décroissante (plus récent en premier)
  uniqueDocs.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return uniqueDocs;
}

/**
 * Vérifie qu'une URL est réellement exploitable (pas vide, pas un placeholder)
 */
function isUrlExploitable(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  // Exclure les placeholders courants
  if (trimmed.includes('placeholder') || trimmed.includes('undefined') || trimmed.includes('null')) return false;
  return true;
}

/**
 * Groupe les documents par catégorie
 */
export function groupDocsByCategory(docs: NormalizedDoc[]): Record<string, NormalizedDoc[]> {
  const grouped: Record<string, NormalizedDoc[]> = {};
  for (const doc of docs) {
    if (!grouped[doc.category]) grouped[doc.category] = [];
    grouped[doc.category].push(doc);
  }
  return grouped;
}

/**
 * Filtre uniquement les documents disponibles (URL exploitable)
 */
export function getAvailableDocs(docs: NormalizedDoc[]): NormalizedDoc[] {
  return docs.filter(d => d.status === 'available');
}
