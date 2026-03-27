/**
 * useRentabiliteList — Merges Supabase snapshots with Apogée projects.
 * v3: Includes univers, apporteur, dateCreation for filtering.
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
  libelle: string;
  univers: string;
  apporteurName: string;
  dateCreation: string | null;
  /** Date de la dernière facture (pour filtrage par date) */
  lastFactureDate: string | null;
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

      const [snapshots, rawProjects, rawClients, rawFactures] = await Promise.all([
        listSnapshots(agencyId!),
        services.getProjects(agencySlug, dateRange),
        services.getClients(agencySlug),
        services.getFactures(agencySlug, dateRange),
      ]);

      // Build set of project IDs that have at least one facture + latest facture date per project
      const projectsWithFacture = new Set<string>();
      const projectLastFactureDate = new Map<string, string>();
      for (const f of (rawFactures || []) as Record<string, unknown>[]) {
        const pid = f.dossierId ?? f.dossier_id ?? f.projectId ?? f.project_id;
        if (pid != null) {
          const pidStr = String(pid);
          projectsWithFacture.add(pidStr);
          const fDate = String(f.date ?? f.dateFacture ?? f.date_facture ?? f.createdAt ?? '');
          if (fDate) {
            const existing = projectLastFactureDate.get(pidStr);
            if (!existing || fDate > existing) projectLastFactureDate.set(pidStr, fDate);
          }
        }
      }

      const snapshotMap = new Map<string, ProfitabilitySnapshot>();
      for (const snap of snapshots) {
        const existing = snapshotMap.get(snap.project_id);
        if (!existing || snap.version > existing.version) {
          snapshotMap.set(snap.project_id, snap);
        }
      }

      const clientMap = new Map<number, Record<string, unknown>>();
      for (const c of (rawClients || []) as Record<string, unknown>[]) {
        if (c.id != null) {
          clientMap.set(Number(c.id), c);
        }
      }

      const items: RentabiliteListItem[] = [];
      const seenProjectIds = new Set<string>();

      for (const proj of (rawProjects || []) as Record<string, unknown>[]) {
        const projectId = String(proj.id ?? '');
        if (!projectId || seenProjectIds.has(projectId)) continue;
        // Only include projects that have at least one facture (dossiers terminés)
        if (!projectsWithFacture.has(projectId)) continue;
        seenProjectIds.add(projectId);

        const clientId = Number(proj.clientId ?? proj.client_id ?? 0);
        const client = clientMap.get(clientId);
        const clientName = String(client?.name ?? client?.nom ?? '');
        const snapshot = snapshotMap.get(projectId) || null;
        const projectRef = String(proj.reference ?? proj.ref ?? proj.projectRef ?? projectId);

        // Libellé du dossier
        const libelle = String(proj.libelle ?? proj.label ?? proj.name ?? proj.titre ?? '');

        // Extract univers
        const univers = String(proj.univers ?? proj.universe ?? proj.typeUnivers ?? '');

        // Extract apporteur from project or client (commanditaire)
        const commanditaire = (proj.commanditaire ?? proj.apporteur ?? {}) as Record<string, unknown>;
        const apporteurName = String(
          commanditaire?.name ?? commanditaire?.nom ?? commanditaire?.raisonSociale ??
          proj.apporteurName ?? proj.commanditaireName ?? ''
        );

        // Date creation
        const dateCreation = (proj.dateCreation ?? proj.createdAt ?? proj.created_at ?? null) as string | null;

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
          libelle,
          univers,
          apporteurName,
          dateCreation,
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
            libelle: '',
            univers: '',
            apporteurName: '',
            dateCreation: null,
            hasSnapshot: true,
            snapshot,
          });
        }
      }

      return items;
    },
  });
}
