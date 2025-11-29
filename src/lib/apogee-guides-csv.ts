// Utilitaire d'import CSV pour apogee_guides
import type { ApogeeGuideInsert } from '@/types/apogeeGuides';
import { insertManyApogeeGuides } from './apogee-guides-service';

export interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

// Parse une ligne CSV (gère les guillemets)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Colonnes attendues dans le CSV
const EXPECTED_COLUMNS = ['titre', 'categorie', 'section', 'texte', 'version', 'tags'];

/**
 * Parse un fichier CSV et retourne les guides à importer
 * Format attendu: titre,categorie,section,texte,version,tags
 * Première ligne = headers
 */
export function parseApogeeGuidesCSV(csvContent: string): { guides: ApogeeGuideInsert[]; errors: string[] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  const guides: ApogeeGuideInsert[] = [];

  if (lines.length < 2) {
    errors.push('Le fichier CSV doit contenir au moins une ligne de headers et une ligne de données');
    return { guides, errors };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Vérifier les colonnes requises
  const requiredColumns = ['titre', 'categorie', 'section', 'texte'];
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      errors.push(`Colonne requise manquante: ${col}`);
    }
  }

  if (errors.length > 0) {
    return { guides, errors };
  }

  // Index des colonnes
  const columnIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    columnIndex[h] = i;
  });

  // Parse les lignes de données
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    const titre = values[columnIndex['titre']] || '';
    const categorie = values[columnIndex['categorie']] || '';
    const section = values[columnIndex['section']] || '';
    const texte = values[columnIndex['texte']] || '';
    const version = columnIndex['version'] !== undefined ? values[columnIndex['version']] : undefined;
    const tags = columnIndex['tags'] !== undefined ? values[columnIndex['tags']] : undefined;

    // Validation
    if (!titre || !categorie || !section || !texte) {
      errors.push(`Ligne ${i + 1}: champs obligatoires manquants (titre, categorie, section, texte)`);
      continue;
    }

    guides.push({
      titre,
      categorie,
      section,
      texte,
      version: version || '2025-11-29',
      tags: tags || null,
    });
  }

  return { guides, errors };
}

/**
 * Importe un fichier CSV dans la table apogee_guides
 */
export async function importApogeeGuidesFromCSV(csvContent: string): Promise<CSVImportResult> {
  const { guides, errors } = parseApogeeGuidesCSV(csvContent);

  if (errors.length > 0 && guides.length === 0) {
    return { success: false, imported: 0, errors };
  }

  try {
    const inserted = await insertManyApogeeGuides(guides);
    return {
      success: true,
      imported: inserted.length,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      imported: 0,
      errors: [...errors, `Erreur d'insertion: ${err instanceof Error ? err.message : 'Erreur inconnue'}`],
    };
  }
}

/**
 * Génère un template CSV vide
 */
export function generateCSVTemplate(): string {
  return 'titre,categorie,section,texte,version,tags\n"Exemple de titre","Ma Catégorie","Ma Section","Contenu du texte ici...","2025-11-29","tag1, tag2, tag3"';
}

/**
 * Exporte les guides en CSV
 */
export function exportApogeeGuidesToCSV(guides: { titre: string; categorie: string; section: string; texte: string; version: string | null; tags: string | null }[]): string {
  const header = 'titre,categorie,section,texte,version,tags';
  const rows = guides.map(g => {
    const escape = (val: string | null) => {
      if (!val) return '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    return [
      escape(g.titre),
      escape(g.categorie),
      escape(g.section),
      escape(g.texte),
      escape(g.version),
      escape(g.tags),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}
