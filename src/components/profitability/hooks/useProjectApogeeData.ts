/**
 * useProjectApogeeData — Centralized source of Apogée data for a single project.
 * Filters factures and interventions from the global cached data.
 */
import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import type { ProfitabilityFacture, ProfitabilityIntervention } from '@/types/projectProfitability';

interface ProjectApogeeData {
  factures: ProfitabilityFacture[];
  interventions: ProfitabilityIntervention[];
}

/**
 * Loads and maps Apogée factures + interventions for a specific project.
 * Uses the global cached data service (2-min TTL) — no additional API calls.
 */
export function useProjectApogeeData(projectId: string | null) {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug || currentAgency?.id || '';
  const services = getGlobalApogeeDataServices();

  return useQuery<ProjectApogeeData>({
    queryKey: ['project-apogee-data', agencySlug, projectId],
    enabled: isAgencyReady && !!agencySlug && !!projectId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // Use a wide date range to get all project data
      const dateRange = { start: new Date('2020-01-01'), end: new Date() };

      const [rawFactures, rawInterventions] = await Promise.all([
        services.getFactures(agencySlug, dateRange),
        services.getInterventions(agencySlug, dateRange),
      ]);

      // Filter by projectId and map to engine format
      const numericProjectId = Number(projectId);

      const factures: ProfitabilityFacture[] = (rawFactures || [])
        .filter((f: Record<string, unknown>) => {
          const pId = f.projectId ?? f.project_id ?? (f.data as Record<string, unknown>)?.projectId;
          return Number(pId) === numericProjectId;
        })
        .map((f: Record<string, unknown>) => ({
          id: String(f.id ?? ''),
          totalHT: Number(f.totalHT ?? f.montantHT ?? (f.data as Record<string, unknown>)?.totalHT ?? 0),
          totalTTC: Number(f.totalTTC ?? 0),
          typeFacture: (f.typeFacture ?? f.type ?? null) as string | null,
          paidTTC: Number(f.paidTTC ?? f.totalTTC ?? 0),
          updatedAt: (f.updatedAt ?? f.updated_at ?? null) as string | null,
        }));

      const interventions: ProfitabilityIntervention[] = (rawInterventions || [])
        .filter((i: Record<string, unknown>) => {
          const pId = i.projectId ?? i.project_id;
          return Number(pId) === numericProjectId;
        })
        .map((i: Record<string, unknown>) => {
          const techIds: string[] = [];
          if (Array.isArray(i.usersIds)) {
            techIds.push(...i.usersIds.map(String));
          } else if (i.userId || i.user_id) {
            techIds.push(String(i.userId ?? i.user_id));
          }
          // Also check nested visites for additional technicians
          const visites = (i.visites ?? (i.data as Record<string, unknown>)?.visites) as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(visites)) {
            for (const v of visites) {
              if (Array.isArray(v.usersIds)) {
                for (const uid of v.usersIds) {
                  const sid = String(uid);
                  if (!techIds.includes(sid)) techIds.push(sid);
                }
              }
            }
          }

          return {
            id: String(i.id ?? ''),
            technicianIds: techIds,
            hours: Number(i.hours ?? i.duree ?? 0),
            updatedAt: (i.updatedAt ?? i.updated_at ?? null) as string | null,
          };
        });

      return { factures, interventions };
    },
  });
}
