/**
 * useVeilleAdaptive - Hook Veille unifié basé sur le scoring adaptatif
 * 
 * Remplace l'ancien useVeilleApporteurs pour la tab Veille.
 * Utilise exactement le même computeAdaptiveScore que les fiches individuelles.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { apogeeProxy } from '@/services/apogeeProxy';
import { computeAdaptiveScore, type AdaptiveScore, type MonthlyTrendEntry, type ScoreLevel, type RecentMonthsOption } from '../engine/adaptiveScoring';

// ==================== TYPES ====================

export interface VeilleApporteurRow {
  apporteurId: string;
  apporteurNom: string;
  score: number;
  level: ScoreLevel;
  label: string;
  // Métriques
  caAvgMensuel: number;
  caRecentMensuel: number;
  caVariationPct: number;
  dossiersAvg: number;
  dossiersRecent: number;
  dossiersVariationPct: number;
  facturesAvg: number;
  facturesRecent: number;
  tauxTransfoAvg: number | null;
  // Dormance
  dernierDossierDate: string | null;
  joursInactivite: number;
  isDormant: boolean;
  // Alertes
  alerts: string[];
  // Raw data
  monthlyTrendFull: MonthlyTrendEntry[];
}

export interface VeilleKPIs {
  total: number;
  dormants: number;
  enBaisse: number;
  stables: number;
  enHausse: number;
}

export type VeilleFilterType = 'all' | 'dormants' | 'en_baisse' | 'stables' | 'en_hausse';
export type VeilleSortKey = 'nom' | 'score' | 'caVariationPct' | 'caRecentMensuel' | 'dossiersRecent' | 'joursInactivite';

const VALID_DEVIS_STATES = ['validated', 'signed', 'order', 'accepted'];

function buildMonthlyTrendForApporteur(
  projects: any[],
  factures: any[],
  devis: any[],
  projectIds: Set<any>,
): MonthlyTrendEntry[] {
  const monthMap = new Map<string, { dossiers: number; ca_ht: number; devis_total: number; devis_signed: number; factures: number }>();

  // Dossiers
  for (const p of projects) {
    const d = (p.dateReelle || p.date || p.created_at || '').slice(0, 7);
    if (!d) continue;
    const m = monthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
    m.dossiers++;
    monthMap.set(d, m);
  }

  // Factures
  const apporteurFactures = factures.filter((f: any) => {
    const fPid = f.projectId ?? f.project_id;
    return projectIds.has(fPid) || projectIds.has(Number(fPid)) || projectIds.has(String(fPid));
  });
  const facturatedProjectIds = new Set(apporteurFactures.map((f: any) => String(f.projectId ?? f.project_id)));

  for (const f of apporteurFactures) {
    const d = (f.dateReelle || f.date || f.created_at || '').slice(0, 7);
    if (!d) continue;
    const m = monthMap.get(d) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
    m.ca_ht += Number(f.data?.totalHT ?? f.totalHT ?? 0) || 0;
    m.factures++;
    monthMap.set(d, m);
  }

  // Devis
  const apporteurDevis = devis.filter((d: any) => {
    const dPid = d.projectId ?? d.project_id;
    return projectIds.has(dPid) || projectIds.has(Number(dPid)) || projectIds.has(String(dPid));
  });

  for (const d of apporteurDevis) {
    const dt = (d.dateReelle || d.date || d.created_at || '').slice(0, 7);
    if (!dt) continue;
    const m = monthMap.get(dt) || { dossiers: 0, ca_ht: 0, devis_total: 0, devis_signed: 0, factures: 0 };
    m.devis_total++;
    if (VALID_DEVIS_STATES.includes(d.state?.toLowerCase?.()) || d.refId || d.invoiceId
        || facturatedProjectIds.has(String(d.projectId ?? d.project_id))) {
      m.devis_signed++;
    }
    monthMap.set(dt, m);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      dossiers: d.dossiers,
      ca_ht: Math.round(d.ca_ht),
      factures: d.factures,
      devis_total: d.devis_total,
      devis_signed: d.devis_signed,
      taux_transfo: d.devis_total > 0 ? Math.round((d.devis_signed / d.devis_total) * 10000) / 100 : null,
    }));
}

function computeJoursInactivite(projects: any[]): { jours: number; dernierDate: string | null } {
  if (projects.length === 0) return { jours: 9999, dernierDate: null };
  
  let maxDate = '';
  for (const p of projects) {
    const d = p.dateReelle || p.date || p.created_at || '';
    if (d > maxDate) maxDate = d;
  }
  
  if (!maxDate) return { jours: 9999, dernierDate: null };
  
  const last = new Date(maxDate);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return {
    jours: Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24))),
    dernierDate: maxDate.slice(0, 10),
  };
}

// ==================== HOOK ====================

export function useVeilleAdaptive() {
  const { agence } = useProfile();
  const agenceSlug = agence || '';

  const [recentMonths, setRecentMonths] = useState<RecentMonthsOption>(3);
  const [seuilDormantMois, setSeuilDormantMois] = useState(2);
  const [activeFilter, setActiveFilter] = useState<VeilleFilterType>('all');
  const [sortKey, setSortKey] = useState<VeilleSortKey>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Charger TOUTES les données de l'agence en une seule fois
  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ['veille-adaptive-data', agenceSlug],
    queryFn: async () => {
      if (!agenceSlug) throw new Error('No agency');
      return apogeeProxy.getAllData(agenceSlug);
    },
    enabled: !!agenceSlug,
    staleTime: 5 * 60 * 1000,
  });

  // Calculer les rows pour chaque apporteur
  const allRows = useMemo((): VeilleApporteurRow[] => {
    if (!rawData) return [];

    const { projects = [], factures = [], devis = [], clients = [] } = rawData;
    const seuilDormantJours = seuilDormantMois * 30;

    // Index clients par id pour résolution noms
    const clientsById = new Map<string, string>();
    for (const c of clients) {
      const nom = c.raisonSociale || c.nom || c.name || c.displayName;
      if (c.id && nom) clientsById.set(String(c.id), nom);
    }

    // Grouper projets par commanditaireId
    const projectsByApporteur = new Map<string, any[]>();
    for (const p of projects) {
      const cmdId = p?.data?.commanditaireId;
      if (cmdId === undefined || cmdId === null) continue;
      const key = String(cmdId);
      const arr = projectsByApporteur.get(key) || [];
      arr.push(p);
      projectsByApporteur.set(key, arr);
    }

    const rows: VeilleApporteurRow[] = [];

    for (const [apporteurId, apporteurProjects] of projectsByApporteur.entries()) {
      const projectIds = new Set<any>();
      for (const p of apporteurProjects) {
        projectIds.add(p.id);
        projectIds.add(Number(p.id));
        projectIds.add(String(p.id));
      }

      const monthlyTrendFull = buildMonthlyTrendForApporteur(apporteurProjects, factures, devis, projectIds);
      const adaptiveScore = computeAdaptiveScore(monthlyTrendFull, recentMonths);
      const { jours: joursInactivite, dernierDate } = computeJoursInactivite(apporteurProjects);

      const nom = clientsById.get(apporteurId) || `Apporteur #${apporteurId}`;

      if (adaptiveScore) {
        rows.push({
          apporteurId,
          apporteurNom: nom,
          score: adaptiveScore.score,
          level: adaptiveScore.level,
          label: adaptiveScore.label,
          caAvgMensuel: adaptiveScore.metrics.ca.avg,
          caRecentMensuel: adaptiveScore.metrics.ca.recent,
          caVariationPct: adaptiveScore.metrics.ca.variationPct,
          dossiersAvg: adaptiveScore.metrics.dossiers.avg,
          dossiersRecent: adaptiveScore.metrics.dossiers.recent,
          dossiersVariationPct: adaptiveScore.metrics.dossiers.variationPct,
          facturesAvg: adaptiveScore.metrics.factures.avg,
          facturesRecent: adaptiveScore.metrics.factures.recent,
          tauxTransfoAvg: adaptiveScore.metrics.tauxTransfo.avg,
          dernierDossierDate: dernierDate,
          joursInactivite,
          isDormant: joursInactivite > seuilDormantJours,
          alerts: adaptiveScore.alerts,
          monthlyTrendFull,
        });
      } else {
        // Pas assez d'historique pour un score — on les inclut quand même comme "non scorés"
        rows.push({
          apporteurId,
          apporteurNom: nom,
          score: -1,
          level: 'stable',
          label: 'Données insuffisantes',
          caAvgMensuel: 0,
          caRecentMensuel: 0,
          caVariationPct: 0,
          dossiersAvg: 0,
          dossiersRecent: 0,
          dossiersVariationPct: 0,
          facturesAvg: 0,
          facturesRecent: 0,
          tauxTransfoAvg: null,
          dernierDossierDate: dernierDate,
          joursInactivite,
          isDormant: joursInactivite > seuilDormantJours,
          alerts: [],
          monthlyTrendFull,
        });
      }
    }

    return rows;
  }, [rawData, recentMonths, seuilDormantMois]);

  // KPIs
  const kpis = useMemo((): VeilleKPIs => {
    const scored = allRows.filter(r => r.score >= 0);
    return {
      total: allRows.length,
      dormants: allRows.filter(r => r.isDormant).length,
      enBaisse: scored.filter(r => r.score < 42).length,
      stables: scored.filter(r => r.score >= 42 && r.score <= 58).length,
      enHausse: scored.filter(r => r.score > 58).length,
    };
  }, [allRows]);

  // Filtrage + tri + recherche
  const filteredRows = useMemo(() => {
    let result = [...allRows];

    // Filtre catégorie
    switch (activeFilter) {
      case 'dormants': result = result.filter(r => r.isDormant); break;
      case 'en_baisse': result = result.filter(r => r.score >= 0 && r.score < 42); break;
      case 'stables': result = result.filter(r => r.score >= 42 && r.score <= 58); break;
      case 'en_hausse': result = result.filter(r => r.score > 58); break;
    }

    // Recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => r.apporteurNom.toLowerCase().includes(q));
    }

    // Tri
    result.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'nom': va = a.apporteurNom.toLowerCase(); vb = b.apporteurNom.toLowerCase(); break;
        case 'score': va = a.score; vb = b.score; break;
        case 'caVariationPct': va = a.caVariationPct; vb = b.caVariationPct; break;
        case 'caRecentMensuel': va = a.caRecentMensuel; vb = b.caRecentMensuel; break;
        case 'dossiersRecent': va = a.dossiersRecent; vb = b.dossiersRecent; break;
        case 'joursInactivite': va = a.joursInactivite; vb = b.joursInactivite; break;
        default: va = a.score; vb = b.score;
      }
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allRows, activeFilter, searchQuery, sortKey, sortDirection]);

  const toggleSort = (key: VeilleSortKey) => {
    if (sortKey === key) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('desc'); }
  };

  return {
    rows: filteredRows,
    allRows,
    kpis,
    isLoading,
    error,
    recentMonths,
    setRecentMonths,
    seuilDormantMois,
    setSeuilDormantMois,
    activeFilter,
    setActiveFilter,
    sortKey,
    sortDirection,
    toggleSort,
    searchQuery,
    setSearchQuery,
    refetch,
  };
}
