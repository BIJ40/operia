/**
 * Hook pour charger et filtrer les devis acceptés, agrégés par dossier.
 * 
 * Mapping API Apogée :
 * - devis.state : 'accepted' | 'order' (commandé = accepté + en travaux)
 * - devis.data.totalHT : montant HT du devis
 * - project.ref / project.label : référence et libellé du dossier
 * - project.state : état du dossier (to_planify_tvx, devis_to_order, wait_fourn, etc.)
 * - project.data.universes : univers métier du projet
 * - project.data.searchFilters.ville : ville du chantier
 * - project.data.commanditaireId : ID du commanditaire (apporteur)
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataService } from '@/apogee-connect/services/dataService';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import type { Project, Client, Devis, Intervention } from '@/apogee-connect/types';

// Seuls les devis explicitement acceptés ou commandés (order = accepté + en travaux)
const ACCEPTED_STATES = ['accepted', 'order'];

/** @deprecated Kept for type export compat */
export type DossierStatusFilter = 'all' | 'to_action' | 'to_action_commander' | 'to_action_fourn' | 'to_action_planifier' | 'planned';

/** États projet = "à traiter" */
const TO_ACTION_STATES = new Set(['devis_to_order', 'wait_fourn', 'to_planify_tvx']);
const PLANNED_LABEL = 'Planifié';

export interface DossierDevisAccepte {
  projectId: string;
  projectRef: string;
  projectLabel: string;
  projectState: string;
  projectStateLabel: string;
  hasPlannedIntervention: boolean;
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
  villes: string[];
  apporteurs: string[];
  statuses: string[];
  statusFilter: DossierStatusFilter;
  sortField: SortField;
  sortDir: SortDirection;
}

/** Labels lisibles pour les états projet */
const PROJECT_STATE_LABELS: Record<string, string> = {
  'new': 'Nouveau',
  'devis_to_order': 'À commander',
  'wait_fourn': 'Attente fourn.',
  'to_planify_tvx': 'À planifier',
  'planifie_rt': 'Planifié RT',
  'rt_fait': 'RT fait',
  'devis_a_faire': 'Devis à faire',
  'done': 'Terminé',
  'canceled': 'Annulé',
  'invoice': 'Facturé',
};

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
    villes: [],
    apporteurs: [],
    statuses: [],
    statusFilter: 'all',
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
        interventions: (apiData.interventions || []) as Intervention[],
      };
    },
  });

  const { dossiers, allUnivers, allVilles, allApporteurs, allStatuses, statusCounts } = useMemo(() => {
    if (!rawData) return { 
      dossiers: [], 
      allUnivers: [] as string[], 
      allVilles: [] as string[],
      allApporteurs: [] as string[],
      allStatuses: [] as string[],
      statusCounts: { all: 0, to_action: 0, to_action_commander: 0, to_action_fourn: 0, to_action_planifier: 0, planned: 0 } 
    };

    const devis = rawData.devis || [];
    const projects = rawData.projects || [];
    const clients = rawData.clients || [];
    const interventions = rawData.interventions || [];

    // Maps for enrichment
    const projectMap = new Map(projects.map(p => [String(p.id), p]));
    const clientMap = new Map(clients.map(c => [String(c.id), c]));
    
    // Build intervention index by projectId to detect "planifié"
    const interventionsByProject = new Map<string, Intervention[]>();
    for (const itv of interventions) {
      const pid = String(itv.projectId);
      const list = interventionsByProject.get(pid) || [];
      list.push(itv);
      interventionsByProject.set(pid, list);
    }

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
    const villesSet = new Set<string>();
    const apporteursSet = new Set<string>();
    const statusesSet = new Set<string>();
    const result: DossierDevisAccepte[] = [];
    const counts = { all: 0, to_action: 0, to_action_commander: 0, to_action_fourn: 0, to_action_planifier: 0, planned: 0 };

    for (const [pid, { devisList, totalHT }] of byProject) {
      const project = projectMap.get(pid);
      const projectData = (project as any)?.data || {};
      
      // Project state
      const projectState = (project?.state || '').toLowerCase();
      const projectStateLabel = PROJECT_STATE_LABELS[projectState] || projectState || '—';
      
      // Check if has planned interventions (= "planifié")
      const projectInterventions = interventionsByProject.get(pid) || [];
      const now = new Date();
      const hasPlannedIntervention = projectInterventions.some(itv => {
        const dateStr = itv.date || itv.dateIntervention || (itv as any).dateReelle;
        if (!dateStr) return false;
        try {
          const d = new Date(dateStr);
          return d >= now; // Future or today = planifié
        } catch { return false; }
      });

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
      if (ville && ville !== '—') villesSet.add(ville);

      // Track apporteur name
      const commanditaireNameStr = commanditaire?.nom || commanditaire?.raisonSociale || '';
      if (commanditaireNameStr) apporteursSet.add(commanditaireNameStr);

      // Track status labels
      if (projectStateLabel && projectStateLabel !== '—') statusesSet.add(projectStateLabel);
      if (hasPlannedIntervention) statusesSet.add(PLANNED_LABEL);

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

      // Count by status category
      counts.all++;
      if (TO_ACTION_STATES.has(projectState)) {
        counts.to_action++;
        if (projectState === 'devis_to_order') counts.to_action_commander++;
        if (projectState === 'wait_fourn') counts.to_action_fourn++;
        if (projectState === 'to_planify_tvx') counts.to_action_planifier++;
      }
      if (hasPlannedIntervention) counts.planned++;

      result.push({
        projectId: pid,
        projectRef,
        projectLabel,
        projectState,
        projectStateLabel,
        hasPlannedIntervention,
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
      allUnivers: Array.from(universSet).sort(),
      allVilles: Array.from(villesSet).sort(),
      allApporteurs: Array.from(apporteursSet).sort(),
      allStatuses: Array.from(statusesSet).sort(),
      statusCounts: counts,
    };
  }, [rawData]);

  // Apply filters & sort
  const filteredDossiers = useMemo(() => {
    let list = [...dossiers];

    // Status filter (column-based multi-select on labels)
    if (filters.statuses.length > 0) {
      list = list.filter(d => {
        const labels: string[] = [d.projectStateLabel];
        if (d.hasPlannedIntervention) labels.push(PLANNED_LABEL);
        return labels.some(l => filters.statuses.includes(l));
      });
    }

    // Legacy status filter (kept for compat)
    switch (filters.statusFilter) {
      case 'to_action':
        list = list.filter(d => TO_ACTION_STATES.has(d.projectState));
        break;
      case 'to_action_commander':
        list = list.filter(d => d.projectState === 'devis_to_order');
        break;
      case 'to_action_fourn':
        list = list.filter(d => d.projectState === 'wait_fourn');
        break;
      case 'to_action_planifier':
        list = list.filter(d => d.projectState === 'to_planify_tvx');
        break;
      case 'planned':
        list = list.filter(d => d.hasPlannedIntervention);
        break;
    }

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

    // Ville filter
    if (filters.villes.length > 0) {
      list = list.filter(d => filters.villes.includes(d.ville));
    }

    // Apporteur filter
    if (filters.apporteurs.length > 0) {
      list = list.filter(d => filters.apporteurs.includes(d.commanditaireName));
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
    allVilles,
    allApporteurs,
    allStatuses,
    statusCounts,
    isLoading,
    filters,
    setFilters,
    setSearch: (search: string) => setFilters(f => ({ ...f, search })),
    setUniversFilter: (univers: string[]) => setFilters(f => ({ ...f, univers })),
    setVillesFilter: (villes: string[]) => setFilters(f => ({ ...f, villes })),
    setApporteursFilter: (apporteurs: string[]) => setFilters(f => ({ ...f, apporteurs })),
    setStatusesFilter: (statuses: string[]) => setFilters(f => ({ ...f, statuses })),
    setStatusFilter: (statusFilter: DossierStatusFilter) => setFilters(f => ({ ...f, statusFilter })),
    setSort: (field: SortField) => setFilters(f => ({
      ...f,
      sortField: field,
      sortDir: f.sortField === field && f.sortDir === 'desc' ? 'asc' : 'desc',
    })),
  };
}
