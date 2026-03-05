/**
 * Hook pour croiser compétences techniciens (module RH) × univers dossiers
 * Utilise un mapping explicite compétence→univers + fallback fuzzy
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
  /** Map apogeeUserId → infos RH (nom collaborateur) */
  techRoster: Map<number, { name: string }>;
  /** Vérifie si un tech (apogeeUserId) est compatible avec un ensemble d'univers */
  isCompatible: (apogeeUserId: number, universes: string[]) => boolean;
  /** Retourne les compétences matchées pour un tech × univers */
  getMatchedCompetences: (apogeeUserId: number, universes: string[]) => string[];
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// MAPPING EXPLICITE compétence catalogue → slugs univers Apogée
// ============================================================================

/**
 * Chaque clé = label normalisé de compétence (lowercase, sans accents)
 * Chaque valeur = liste de slugs univers Apogée (normalisés) qui matchent
 * 
 * Ce mapping est la source de vérité pour le matching compétence ↔ univers.
 * Il couvre les labels du catalogue par défaut ET les slugs courants Apogée.
 */
const COMPETENCE_TO_UNIVERS: Record<string, string[]> = {
  // Catalogue par défaut
  'plomberie':            ['plomberie', 'sanitaire', 'sanitaires', 'plomb'],
  'electricite':          ['electricite', 'elec', 'electrique'],
  'serrurerie':           ['serrurerie', 'serrure', 'serrurier', 'serr'],
  'vitrerie':             ['vitrerie', 'vitre', 'vitres', 'vitrier', 'miroiterie', 'vitr'],
  'menuiserie':           ['menuiserie', 'menuisier', 'bois', 'porte', 'portes', 'fenetre', 'fenetres'],
  'chauffage':            ['chauffage', 'chaudiere', 'climatisation', 'clim', 'cvc', 'pac', 'pompe_a_chaleur'],
  'volet roulant':        ['volet_roulant', 'volets_roulants', 'volet', 'volets', 'store', 'stores'],
  'pmr / accessibilite':  ['pmr', 'amelioration_logement', 'ame_logement', 'pmr_amenagement', 'accessibilite'],
  'renovation':           ['renovation', 'reno', 'travaux'],
  'multiservices':        ['multiservices', 'multi'],
  'peinture':             ['peinture', 'peintre', 'revetement'],
  'carrelage / faience':  ['carrelage', 'faience', 'carreleur'],
  'recherche de fuite':   ['recherche_fuite', 'recherche_de_fuite', 'fuite'],
};

// ============================================================================
// NORMALISATION
// ============================================================================

/** Normalise une chaîne pour le matching (lowercase, sans accents, sans ponctuation superflue) */
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime accents
    .trim();
}

/** Normalise un slug univers Apogée */
function normalizeSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// ============================================================================
// Construit le reverse map : slug univers → set de compétences normalisées
// ============================================================================

const UNIVERS_TO_COMPETENCES = new Map<string, Set<string>>();

for (const [compLabel, universSlugs] of Object.entries(COMPETENCE_TO_UNIVERS)) {
  for (const slug of universSlugs) {
    const normSlug = normalizeSlug(slug);
    if (!UNIVERS_TO_COMPETENCES.has(normSlug)) {
      UNIVERS_TO_COMPETENCES.set(normSlug, new Set());
    }
    UNIVERS_TO_COMPETENCES.get(normSlug)!.add(compLabel);
  }
}

/**
 * Vérifie si une compétence (label RH) matche un univers (slug Apogée)
 * 1. Matching via la table explicite (priorité)
 * 2. Fallback fuzzy (l'un contient l'autre)
 */
function competenceMatchesUnivers(competenceLabel: string, universSlug: string): boolean {
  const normComp = normalize(competenceLabel);
  const normUni = normalizeSlug(universSlug);
  
  if (!normComp || !normUni) return false;
  
  // 1. Lookup explicite : est-ce que la compétence est dans le mapping pour cet univers ?
  const matchingComps = UNIVERS_TO_COMPETENCES.get(normUni);
  if (matchingComps) {
    // Vérifier si la compétence normalisée est dans le set
    for (const mappedComp of matchingComps) {
      if (normComp === mappedComp || normComp.includes(mappedComp) || mappedComp.includes(normComp)) {
        return true;
      }
    }
  }
  
  // 2. Lookup direct : est-ce que la compétence a une entrée dans COMPETENCE_TO_UNIVERS ?
  const directMatch = COMPETENCE_TO_UNIVERS[normComp];
  if (directMatch) {
    return directMatch.some(slug => normalizeSlug(slug) === normUni);
  }
  
  // 3. Fallback fuzzy (pour les compétences custom hors catalogue)
  const compAlpha = normComp.replace(/[^a-z0-9]/g, '');
  const uniAlpha = normUni.replace(/[^a-z0-9]/g, '');
  return compAlpha.length >= 3 && uniAlpha.length >= 3 && 
    (compAlpha.includes(uniAlpha) || uniAlpha.includes(compAlpha));
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
    staleTime: 10 * 60 * 1000,
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

  const techRoster = useMemo(() => {
    const map = new Map<number, { name: string }>();
    for (const t of data || []) {
      if (t.apogeeUserId) {
        map.set(t.apogeeUserId, { name: t.name || `#${t.apogeeUserId}` });
      }
    }
    return map;
  }, [data]);

  const isCompatible = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): boolean => {
      const comps = techCompetences.get(apogeeUserId);
      // Pas de compétences renseignées → compatible par défaut
      if (!comps || comps.length === 0) return true;
      if (!universes || universes.length === 0) return true;
      
      // Au moins une compétence doit matcher au moins un univers
      return universes.some(uni => 
        comps.some(comp => competenceMatchesUnivers(comp, uni))
      );
    };
  }, [techCompetences]);

  const getMatchedCompetences = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): string[] => {
      const comps = techCompetences.get(apogeeUserId);
      if (!comps || !universes) return [];
      return comps.filter(comp => 
        universes.some(uni => competenceMatchesUnivers(comp, uni))
      );
    };
  }, [techCompetences]);

  return { techCompetences, techRoster, isCompatible, getMatchedCompetences, isLoading };
}
