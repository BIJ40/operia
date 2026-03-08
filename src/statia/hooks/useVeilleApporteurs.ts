/**
 * Hook React pour la page Veille Apporteurs
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { getGlobalApogeeDataServices } from '../adapters/dataServiceAdapter';
import { loadAllData } from '../engine/loaders';
import { computeVeilleApporteurs, VeilleApporteursResult, VeilleApporteurConsolide } from '../engines/veilleApporteursEngine';
import { useProfile } from '@/contexts/ProfileContext';
import { logError } from '@/lib/logger';

// ==================== TYPES ====================

export interface VeilleFilters {
  periodeAStart: Date;
  periodeAEnd: Date;
  periodeBStart: Date;
  periodeBEnd: Date;
  seuilInactivite: number;
  seuilCA: number;
}

export type VeilleFilterType = 'all' | 'dormants' | 'declassement' | 'sous_seuil' | 'sains';
export type VeilleSortKey = 'nom' | 'joursInactivite' | 'CA_A_HT' | 'CA_B_HT' | 'variationPct' | 'scoreRisque';
export type VeilleSortDirection = 'asc' | 'desc';

const DEFAULT_SEUIL_INACTIVITE = 30;
const DEFAULT_SEUIL_CA = 5000;

function getDefaultFilters(): VeilleFilters {
  const now = new Date();
  const periodeAEnd = endOfDay(now);
  const periodeAStart = startOfDay(subDays(now, 30));
  const periodeBEnd = startOfDay(subDays(now, 31));
  const periodeBStart = startOfDay(subDays(now, 60));
  
  return { periodeAStart, periodeAEnd, periodeBStart, periodeBEnd, seuilInactivite: DEFAULT_SEUIL_INACTIVITE, seuilCA: DEFAULT_SEUIL_CA };
}

export function useVeilleApporteurs() {
  const { agence } = useAuth();
  const agenceSlug = agence || '';
  
  const [filters, setFilters] = useState<VeilleFilters>(getDefaultFilters);
  const [activeFilter, setActiveFilter] = useState<VeilleFilterType>('all');
  const [sortKey, setSortKey] = useState<VeilleSortKey>('scoreRisque');
  const [sortDirection, setSortDirection] = useState<VeilleSortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApporteur, setSelectedApporteur] = useState<VeilleApporteurConsolide | null>(null);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['veille-apporteurs', agenceSlug, filters],
    queryFn: async (): Promise<VeilleApporteursResult> => {
      if (!agenceSlug) {
        return { apporteurs: [], kpis: { totalActifs: 0, dormants: 0, enDeclassement: 0, sousSeuil: 0, nouveaux: 0, sains: 0 }, periodes: { A: { start: '', end: '' }, B: { start: '', end: '' } }, seuils: { inactivite: 0, CA: 0 } };
      }
      
      try {
        const services = getGlobalApogeeDataServices();
        const loadedData = await loadAllData({
          dateRange: { start: filters.periodeBStart, end: filters.periodeAEnd },
          agencySlug: agenceSlug,
        }, services);
        
        return computeVeilleApporteurs(loadedData, {
          periodeAStart: filters.periodeAStart,
          periodeAEnd: filters.periodeAEnd,
          periodeBStart: filters.periodeBStart,
          periodeBEnd: filters.periodeBEnd,
          seuilInactivite: filters.seuilInactivite,
          seuilCA: filters.seuilCA,
        });
      } catch (err) {
        logError('Erreur chargement veille apporteurs', err);
        throw err;
      }
    },
    enabled: !!agenceSlug,
    staleTime: 5 * 60 * 1000,
  });
  
  const filteredApporteurs = useMemo(() => {
    if (!data?.apporteurs) return [];
    let result = [...data.apporteurs];
    
    switch (activeFilter) {
      case 'dormants': result = result.filter(a => a.isDormant); break;
      case 'declassement': result = result.filter(a => a.isEnDeclassement); break;
      case 'sous_seuil': result = result.filter(a => a.isSousSeuil); break;
      case 'sains': result = result.filter(a => !a.isDormant && !a.isEnDeclassement && !a.isSousSeuil); break;
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(a => a.apporteurNom.toLowerCase().includes(query));
    }
    
    result.sort((a, b) => {
      let valueA: any, valueB: any;
      switch (sortKey) {
        case 'nom': valueA = a.apporteurNom.toLowerCase(); valueB = b.apporteurNom.toLowerCase(); break;
        case 'joursInactivite': valueA = a.joursInactivite; valueB = b.joursInactivite; break;
        case 'CA_A_HT': valueA = a.CA_A_HT; valueB = b.CA_A_HT; break;
        case 'CA_B_HT': valueA = a.CA_B_HT; valueB = b.CA_B_HT; break;
        case 'variationPct': valueA = a.variationPct ?? -Infinity; valueB = b.variationPct ?? -Infinity; break;
        default: valueA = a.scoreRisque; valueB = b.scoreRisque; break;
      }
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data?.apporteurs, activeFilter, searchQuery, sortKey, sortDirection]);
  
  const updateFilters = (updates: Partial<VeilleFilters>) => setFilters(prev => ({ ...prev, ...updates }));
  const resetFilters = () => setFilters(getDefaultFilters());
  const toggleSort = (key: VeilleSortKey) => {
    if (sortKey === key) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('desc'); }
  };
  
  return {
    apporteurs: filteredApporteurs,
    allApporteurs: data?.apporteurs || [],
    kpis: data?.kpis || { totalActifs: 0, dormants: 0, enDeclassement: 0, sousSeuil: 0, nouveaux: 0, sains: 0 },
    periodes: data?.periodes,
    seuils: data?.seuils,
    isLoading, error, filters, activeFilter, sortKey, sortDirection, searchQuery, selectedApporteur,
    updateFilters, resetFilters, setActiveFilter, toggleSort, setSearchQuery, setSelectedApporteur, refetch,
  };
}
