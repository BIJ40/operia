/**
 * Hook pour charger et filtrer les devis acceptés, agrégés par dossier.
 * 
 * Mapping API Apogée :
 * - devis.state : 'accepted' | 'order' (commandé = accepté + en travaux)
 * - devis.data.totalHT : montant HT du devis
 * - project.ref / project.label : référence et libellé du dossier
 * - project.data.universes : univers métier du projet
 * - project.data.searchFilters.ville : ville du chantier
 * - project.data.commanditaireId : ID du commanditaire (apporteur)
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataService } from '@/apogee-connect/services/dataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import type { Project, Client, Devis } from '@/apogee-connect/types';

// Seuls les devis explicitement acceptés ou commandés (order = accepté + en travaux)
const ACCEPTED_STATES = ['accepted', 'order'];

export interface DossierDevisAccepte {
  projectId: string;
  projectRef: string;
  projectLabel: string;
  clientName: string;
  commanditaireName: string;
  ville: string;
  univers: string[];
  nbDevis: number;
  totalHT: number;
  lastDevisDate: string | null;
}

export type SortField = 'totalHT' | 'lastDevisDate' | 'clientName' | 'projectRef';
export type SortDirection = 'asc' | 'desc';

interface Filters {
  search: string;
  univers: string[];
  sortField: SortField;
  sortDir: SortDirection;
}

/** Extrait le montant HT d'un devis (data.totalHT ou root totalHT) */
function extractDevisHT(d: Devis): number {
  const raw = (d as any).data?.totalHT ?? d.totalHT ?? 0;
  return parseFloat(String(raw).replace(/[^0-9.\-]/g, '')) || 0;
}

/** Extrait le state d'un devis (root ou data.state) */
function extractDevisState(d: Devis): string {
  const state = d.state || (d as any).data?.state || '';
  return state.trim().toLowerCase();
}

export function useDevisAcceptes() {
  const { agence } = useProfile();
  const { isAgencyReady } = useAgency();

  const [filters, setFilters] = useState<Filters>({
    search: '',
    univers: [],
    sortField: 'totalHT',
    sortDir: 'desc',
  });

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['devis-acceptes', agence],
    enabled: !!agence && isAgencyReady,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false, agence);
      return {
        devis: (apiData.devis || []) as Devis[],
        projects: (apiData.projects || []) as Project[],
        clients: (apiData.clients || []) as Client[],
      };
    },
  });

  const { dossiers, allUnivers } = useMemo(() => {
    if (!rawData) return { dossiers: [], allUnivers: [] as string[] };

    const { devis, projects, clients } = rawData;

    // Maps for enrichment
    const projectMap = new Map(projects.map(p => [String(p.id), p]));
    const clientMap = new Map(clients.map(c => [String(c.id), c]));

    // Filter accepted devis only (accepted + order)
    const acceptedDevis = devis.filter(d => {
      const state = extractDevisState(d);
      return state && ACCEPTED_STATES.includes(state);
    });

    // Aggregate by project
    const byProject = new Map<string, { devisList: Devis[]; totalHT: number }>();
    for (const d of acceptedDevis) {
      const pid = String(d.projectId);
      const existing = byProject.get(pid) || { devisList: [], totalHT: 0 };
      const ht = extractDevisHT(d);
      existing.devisList.push(d);
      existing.totalHT += ht;
      byProject.set(pid, existing);
    }

    const universSet = new Set<string>();
    const result: DossierDevisAccepte[] = [];

    for (const [pid, { devisList, totalHT }] of byProject) {
      const project = projectMap.get(pid);
      const projectData = (project as any)?.data || {};
      
      // Client direct
      const clientId = project?.clientId;
      const client = clientId ? clientMap.get(String(clientId)) : undefined;
      
      // Commanditaire (apporteur)
      const commanditaireId = projectData.commanditaireId || project?.commanditaireId;
      const commanditaire = commanditaireId ? clientMap.get(String(commanditaireId)) : undefined;

      // Universes from project.data.universes or project.universes
      const univers: string[] = projectData.universes || project?.universes || [];
      univers.forEach(u => universSet.add(u));

      // Ville from project.data.searchFilters.ville or project.ville
      const ville = projectData.searchFilters?.ville || project?.ville || '—';

      // Dates
      const dates = devisList
        .map(d => (d as any).dateReelle || d.date)
        .filter(Boolean) as string[];
      const lastDate = dates.length > 0 
        ? dates.sort().reverse()[0] 
        : null;

      // Project ref and label
      const projectRef = (project as any)?.ref || `#${pid}`;
      const projectLabel = (project as any)?.label || project?.nom || '';

      result.push({
        projectId: pid,
        projectRef,
        projectLabel,
        clientName: client?.nom || client?.raisonSociale || '—',
        commanditaireName: commanditaire?.nom || commanditaire?.raisonSociale || '',
        ville,
        univers,
        nbDevis: devisList.length,
        totalHT,
        lastDevisDate: lastDate,
      });
    }

    return { 
      dossiers: result, 
      allUnivers: Array.from(universSet).sort() 
    };
  }, [rawData]);

  // Apply filters & sort
  const filteredDossiers = useMemo(() => {
    let list = [...dossiers];

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(d =>
        d.projectRef.toLowerCase().includes(q) ||
        d.projectLabel.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q) ||
        d.commanditaireName.toLowerCase().includes(q) ||
        d.ville.toLowerCase().includes(q)
      );
    }

    // Univers filter
    if (filters.univers.length > 0) {
      list = list.filter(d =>
        d.univers.some(u => filters.univers.includes(u))
      );
    }

    // Sort
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (filters.sortField) {
        case 'totalHT':
          return (a.totalHT - b.totalHT) * dir;
        case 'lastDevisDate':
          return ((a.lastDevisDate || '') > (b.lastDevisDate || '') ? 1 : -1) * dir;
        case 'clientName':
          return a.clientName.localeCompare(b.clientName) * dir;
        case 'projectRef':
          return a.projectRef.localeCompare(b.projectRef) * dir;
        default:
          return 0;
      }
    });

    return list;
  }, [dossiers, filters]);

  const totalHT = useMemo(
    () => filteredDossiers.reduce((sum, d) => sum + d.totalHT, 0),
    [filteredDossiers]
  );

  return {
    dossiers: filteredDossiers,
    totalDossiers: filteredDossiers.length,
    totalHT,
    allUnivers,
    isLoading,
    filters,
    setFilters,
    setSearch: (search: string) => setFilters(f => ({ ...f, search })),
    setUniversFilter: (univers: string[]) => setFilters(f => ({ ...f, univers })),
    setSort: (field: SortField) => setFilters(f => ({
      ...f,
      sortField: field,
      sortDir: f.sortField === field && f.sortDir === 'desc' ? 'asc' : 'desc',
    })),
  };
}
