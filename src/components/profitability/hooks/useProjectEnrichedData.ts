/**
 * useProjectEnrichedData — Loads enriched project detail via apiGetProjectByRef
 * on explicit user action (opening the detail dialog).
 * 
 * Returns: client name, address, apporteur, reference, documents PDFs, etc.
 */
import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getProjectDetail } from '@/services/projectDetailLoader';
import type { NormalizedDoc } from '@/services/normalizeGeneratedDocs';

export interface EnrichedProjectInfo {
  reference: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  clientPhone: string;
  clientEmail: string;
  apporteurName: string;
  etat: string;
  dateCreation: string | null;
  montantDevis: number;
  documents: NormalizedDoc[];
  raw: Record<string, unknown>;
}

function extractString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k] ?? (obj.data as Record<string, unknown>)?.[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function extractNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k] ?? (obj.data as Record<string, unknown>)?.[k];
    if (v != null) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

export function useProjectEnrichedData(projectRef: string | null, enabled: boolean) {
  const { currentAgency } = useAgency();
  const agencySlug = currentAgency?.slug || currentAgency?.id || '';

  return useQuery<EnrichedProjectInfo | null>({
    queryKey: ['project-enriched', agencySlug, projectRef],
    enabled: enabled && !!projectRef && !!agencySlug,
    staleTime: 10 * 60 * 1000, // 10 min cache
    queryFn: async () => {
      if (!projectRef) return null;

      const result = await getProjectDetail(projectRef, agencySlug);
      if (!result.success || !result.data) return null;

      const raw = result.data.raw;
      
      // Extract client info
      const client = (raw.client ?? raw.commanditaire ?? {}) as Record<string, unknown>;
      const clientName = extractString(client, 'name', 'nom', 'raisonSociale', 'label') ||
        extractString(raw, 'clientName', 'nomClient');
      const clientAddress = extractString(client, 'adresse', 'address', 'rue');
      const clientCity = extractString(client, 'ville', 'city');
      const clientPostalCode = extractString(client, 'codePostal', 'cp', 'postalCode');
      const clientPhone = extractString(client, 'telephone', 'phone', 'tel', 'mobile');
      const clientEmail = extractString(client, 'email', 'mail');

      // Apporteur
      const apporteur = (raw.commanditaire ?? raw.apporteur ?? {}) as Record<string, unknown>;
      const apporteurName = extractString(apporteur, 'name', 'nom', 'raisonSociale', 'label') ||
        extractString(raw, 'apporteurName', 'commanditaireName');

      return {
        reference: extractString(raw, 'reference', 'ref', 'projectRef') || String(projectRef),
        clientName,
        clientAddress,
        clientCity,
        clientPostalCode,
        clientPhone,
        clientEmail,
        apporteurName,
        etat: extractString(raw, 'etat', 'status', 'state'),
        dateCreation: (raw.dateCreation ?? raw.createdAt ?? raw.created_at ?? null) as string | null,
        montantDevis: extractNumber(raw, 'montantDevis', 'totalDevisHT', 'devisAmount'),
        documents: result.data.documents,
        raw,
      };
    },
  });
}
