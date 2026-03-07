/**
 * Utilitaire de parsing Excel pour les prospects
 * Supporte le format: Siren, Siret, Dénomination, Enseigne, etc.
 */
// xlsx is loaded dynamically to reduce bundle size (~200KB)

interface RawProspectRow {
  import_batch_id: string;
  siren: string | null;
  siret: string | null;
  denomination: string | null;
  enseigne: string | null;
  date_creation_etablissement: string | null;
  tranche_effectif: string | null;
  categorie_juridique: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  code_ape: string | null;
  activite_principale: string | null;
  denomination_unite_legale: string | null;
  nb_etablissements: number | null;
  chiffre_affaire: string | null;
  date_cloture_exercice: string | null;
  telephone: string | null;
  site_web: string | null;
  representant: string | null;
  coordonnees: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Map flexible des noms de colonnes
const COLUMN_MAP: Record<string, keyof RawProspectRow> = {
  'siren': 'siren',
  'siret': 'siret',
  'dénomination': 'denomination',
  'denomination': 'denomination',
  'enseigne': 'enseigne',
  'date de création de l\'établissement': 'date_creation_etablissement',
  'date de creation de l\'etablissement': 'date_creation_etablissement',
  'tranche de l\'effectif de l\'établissement': 'tranche_effectif',
  'tranche de l\'effectif de l\'etablissement': 'tranche_effectif',
  'catégorie juridique': 'categorie_juridique',
  'categorie juridique': 'categorie_juridique',
  'adresse': 'adresse',
  'code postal': 'code_postal',
  'code ape/naf': 'code_ape',
  'code ape': 'code_ape',
  'activité principale de l\'établissement': 'activite_principale',
  'activite principale de l\'etablissement': 'activite_principale',
  'dénomination de l\'unité légale': 'denomination_unite_legale',
  'denomination de l\'unite legale': 'denomination_unite_legale',
  'nombre d\'établissements de l\'unité légale': 'nb_etablissements',
  'nombre d\'etablissements de l\'unite legale': 'nb_etablissements',
  'chiffre d\'affaire': 'chiffre_affaire',
  'chiffre d\'affaires': 'chiffre_affaire',
  'date de clôture de l\'exercice': 'date_cloture_exercice',
  'date de cloture de l\'exercice': 'date_cloture_exercice',
  'téléphone': 'telephone',
  'telephone': 'telephone',
  'site web': 'site_web',
  'représentant': 'representant',
  'representant': 'representant',
  'coordonnées': 'coordonnees',
  'coordonnees': 'coordonnees',
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseCoordinates(coordStr: string | null): { latitude: number | null; longitude: number | null } {
  if (!coordStr) return { latitude: null, longitude: null };
  const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { latitude: parts[0], longitude: parts[1] };
  }
  return { latitude: null, longitude: null };
}

function cellToString(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim();
}

export function parseProspectExcel(file: File): Promise<RawProspectRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          reject(new Error('Le fichier est vide'));
          return;
        }

        // Map headers
        const firstRow = jsonData[0];
        const headerMap: Record<string, keyof RawProspectRow> = {};
        for (const key of Object.keys(firstRow)) {
          const normalized = normalizeHeader(key);
          if (COLUMN_MAP[normalized]) {
            headerMap[key] = COLUMN_MAP[normalized];
          }
        }

        const batchId = crypto.randomUUID();
        const rows: RawProspectRow[] = jsonData.map(row => {
          const mapped: Partial<RawProspectRow> = { import_batch_id: batchId };

          for (const [excelKey, dbKey] of Object.entries(headerMap)) {
            const val = row[excelKey];
            if (dbKey === 'nb_etablissements') {
              mapped[dbKey] = val ? parseInt(String(val), 10) || null : null;
            } else {
              (mapped as any)[dbKey] = cellToString(val);
            }
          }

          // Parse coordinates
          const { latitude, longitude } = parseCoordinates(mapped.coordonnees || null);
          mapped.latitude = latitude;
          mapped.longitude = longitude;

          // Extract ville from adresse (format: "159 AV ...,40370 RION-DES-LANDES")
          if (mapped.adresse && mapped.adresse.includes(',')) {
            const lastPart = mapped.adresse.split(',').pop()?.trim() || '';
            const villeMatch = lastPart.replace(/^\d{5}\s+/, '').trim();
            mapped.ville = villeMatch || null;
          }

          return mapped as RawProspectRow;
        }).filter(r => r.denomination || r.enseigne || r.siren); // Skip empty rows

        resolve(rows);
      } catch (err) {
        reject(new Error(`Erreur de lecture du fichier: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Impossible de lire le fichier'));
    reader.readAsArrayBuffer(file);
  });
}
