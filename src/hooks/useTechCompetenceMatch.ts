/**
 * Hook pour croiser compétences techniciens (module RH) × univers dossiers
 * Matching souple (fuzzy) : normalise et compare les chaînes
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface TechCompetenceInfo {
  apogeeUserId: number;
  collaboratorId: string;
  name: string;
  competences: string[];
}

export interface CompetenceMatchResult {
  /** Map apogeeUserId → liste de compétences techniques */
  techCompetences: Map<number, string[]>;
  /** Vérifie si un tech (apogeeUserId) est compatible avec un ensemble d'univers */
  isCompatible: (apogeeUserId: number, universes: string[]) => boolean;
  /** Retourne les compétences matchées pour un tech × univers */
  getMatchedCompetences: (apogeeUserId: number, universes: string[]) => string[];
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// NORMALISATION (matching souple)
// ============================================================================

/** Normalise une chaîne pour le matching fuzzy */
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/[^a-z0-9]/g, '');      // ne garde que alphanum
}

/** Vérifie si deux chaînes matchent en mode souple */
function fuzzyMatch(competence: string, univers: string): boolean {
  const normComp = normalize(competence);
  const normUni = normalize(univers);
  if (!normComp || !normUni) return false;
  // L'un contient l'autre (dans les deux sens)
  return normComp.includes(normUni) || normUni.includes(normComp);
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Charge les compétences techniques des collaborateurs de l'agence
 * et fournit des fonctions de matching avec les univers
 */
export function useTechCompetenceMatch(agencyId: string | undefined): CompetenceMatchResult {
  const { data, isLoading } = useQuery({
    queryKey: ['tech-competences', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data: collabs, error } = await supabase
        .from('collaborators')
        .select(`
          id,
          first_name,
          last_name,
          apogee_user_id,
          rh_competencies(competences_techniques)
        `)
        .eq('agency_id', agencyId)
        .not('apogee_user_id', 'is', null)
        .is('leaving_date', null);
      
      if (error) throw error;
      
      return (collabs || []).map(c => ({
        apogeeUserId: c.apogee_user_id as number,
        collaboratorId: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        competences: ((c as any).rh_competencies?.competences_techniques as string[]) || [],
      })) as TechCompetenceInfo[];
    },
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  const techCompetences = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const t of data || []) {
      if (t.apogeeUserId) {
        map.set(t.apogeeUserId, t.competences);
      }
    }
    return map;
  }, [data]);

  const isCompatible = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): boolean => {
      const comps = techCompetences.get(apogeeUserId);
      // Pas de compétences renseignées → on considère compatible par défaut (pas de données = pas de filtrage)
      if (!comps || comps.length === 0) return true;
      if (!universes || universes.length === 0) return true;
      
      // Au moins une compétence doit matcher au moins un univers
      return universes.some(uni => 
        comps.some(comp => fuzzyMatch(comp, uni))
      );
    };
  }, [techCompetences]);

  const getMatchedCompetences = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): string[] => {
      const comps = techCompetences.get(apogeeUserId);
      if (!comps || !universes) return [];
      return comps.filter(comp => 
        universes.some(uni => fuzzyMatch(comp, uni))
      );
    };
  }, [techCompetences]);

  return { techCompetences, isCompatible, getMatchedCompetences, isLoading };
}
