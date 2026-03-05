/**
 * Normalisation robuste des données API Apogée
 * Gère les variations de structure (wrappers, booléens, etc.)
 */

const norm = (v: unknown): string => String(v ?? "").trim().toLowerCase();
const toNum = (v: unknown): number => Number(String(v ?? "").replace(",", ".")) || 0;

export function unwrapArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.users)) return obj.users;
    if (Array.isArray(obj.result)) return obj.result;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

export function isActiveUser(u: unknown): boolean {
  if (!u || typeof u !== "object") return false;
  const obj = u as Record<string, unknown>;
  const v = obj.is_on ?? obj.isOn ?? obj.is_active ?? obj.isActive;

  // Si l'API ne fournit pas le flag, on considère l'utilisateur actif
  // (sinon on perd des techniciens valides dans certaines agences)
  if (v === undefined || v === null || v === "") return true;

  return v === true || v === 1 || v === "1" || norm(v) === "true";
}

/** Types/roles bureau à exclure du planning terrain */
const EXCLUDED_USER_TYPE_KEYWORDS = [
  'interimaire', 'interim', 'commercial', 'admin', 'administratif',
  'assist', 'utilisateur', 'comptable', 'direction', 'secret',
];

/** Signaux "terrain" autorisés pour reconnaître un salarié technique */
const TECHNICIAN_HINT_KEYWORDS = [
  'techn', 'ouvrier', 'intervenant',
  'plomb', 'peint', 'menuis', 'chauff', 'elect', 'serrur',
  'vitr', 'carrel', 'reno', 'multi', 'fuite',
];

export function isExcludedOfficeType(rawType: unknown): boolean {
  const type = norm(rawType);
  if (!type) return false;
  return EXCLUDED_USER_TYPE_KEYWORDS.some((k) => type.includes(k));
}

function hasTechnicianHint(rawType: unknown): boolean {
  const type = norm(rawType);
  if (!type) return false;
  return TECHNICIAN_HINT_KEYWORDS.some((k) => type.includes(k));
}

export function isTechnician(u: unknown): boolean {
  if (!u || typeof u !== "object") return false;
  const obj = u as Record<string, unknown>;

  const type = obj.type;
  const role = obj.role ?? obj.role_agence ?? obj.fonction ?? obj.job;

  if (isExcludedOfficeType(type) || isExcludedOfficeType(role)) return false;

  return hasTechnicianHint(type) || hasTechnicianHint(role);
}

export interface NormalizedCreneau {
  id: number;
  refType: string;
  date: string;
  duree: number;
  usersIds: number[];
}

export function normalizeCreneaux(raw: unknown): NormalizedCreneau[] {
  const arr = unwrapArray(raw);
  return arr
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const obj = r as Record<string, unknown>;
      return {
        id: Number(obj.id),
        refType: String(obj.refType ?? ""),
        date: String(obj.date ?? ""),
        duree: toNum(obj.duree),
        usersIds: Array.isArray(obj.usersIds) ? obj.usersIds.map(Number) : [],
      };
    })
    .filter((r): r is NormalizedCreneau => 
      r !== null && r.id > 0 && r.date !== "" && r.duree > 0 && r.usersIds.length > 0
    );
}
