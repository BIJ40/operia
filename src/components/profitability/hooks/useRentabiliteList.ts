/**
 * useRentabiliteList — Merges Supabase snapshots with Apogée projects.
 * v2: Includes projectRef for enrichment via apiGetProjectByRef.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { listSnapshots } from '@/repositories/profitabilityRepository';
import type { ProfitabilitySnapshot } from '@/types/projectProfitability';

export interface RentabiliteListItem {
  projectId: string;
  projectLabel: string;
  projectRef: string;
  clientName: string;
  hasSnapshot: boolean;
  snapshot: ProfitabilitySnapshot | null;
}

export function useRentabiliteList() {
  const { agencyId } = useEffectiveAuth();
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug || currentAgency?.id || '';

  return useQuery<RentabiliteListItem[]>({
    queryKey: ['rentabilite-list', agencyId, agencySlug],
    enabled: !!agencyId && isAgencyReady && !!agencySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const services = getGlobalApogeeDataServices();
      const dateRange = { start: new Date('2020-01-01'), end: new Date() };

      const [snapshots, rawProjects, rawClients] = await Promise.all([
        listSnapshots(agencyId!),
        services.getProjects(agencySlug, dateRange),
        services.getClients(agencySlug),
      ]);

      const snapshotMap = new Map<string, ProfitabilitySnapshot>();
      for (const snap of snapshots) {
        const existing = snapshotMap.get(snap.project_id);
        if (!existing || snap.version > existing.version) {
          snapshotMap.set(snap.project_id, snap);
        }
      }

      const clientMap = new Map<number, string>();
      for (const c of (rawClients || []) as Record<string, unknown>[]) {
        if (c.id != null) {
          clientMap.set(Number(c.id), String(c.name ?? ''));
        }
      }

      const items: RentabiliteListItem[] = [];
      const seenProjectIds = new Set<string>();

      for (const proj of (rawProjects || []) as Record<string, unknown>[]) {
        const projectId = String(proj.id ?? '');
        if (!projectId || seenProjectIds.has(projectId)) continue;
        seenProjectIds.add(projectId);

        const clientId = Number(proj.clientId ?? proj.client_id ?? 0);
        const clientName = clientMap.get(clientId) || '';
        const snapshot = snapshotMap.get(projectId) || null;
        const projectRef = String(proj.reference ?? proj.ref ?? proj.projectRef ?? projectId);
        const projectLabel = clientName
          ? `${clientName} — ${projectRef}`
          : projectRef !== projectId
            ? projectRef
            : `Dossier ${projectId}`;

        items.push({
          projectId,
          projectLabel,
          projectRef,
          clientName,
          hasSnapshot: !!snapshot,
          snapshot,
        });
      }

      for (const [projectId, snapshot] of snapshotMap) {
        if (!seenProjectIds.has(projectId)) {
          items.push({
            projectId,
            projectLabel: `Dossier ${projectId}`,
            projectRef: projectId,
            clientName: '',
            hasSnapshot: true,
            snapshot,
          });
        }
      }

      return items;
    },
  });
}
