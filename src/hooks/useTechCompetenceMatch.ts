/**
 * Hook pour croiser compétences techniciens × univers dossiers
 * Source de vérité UNIQUE : technician_skills (table structurée)
 * Fallback : rh_competencies.competences_techniques (ancien système)
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
  /** New structured skills from technician_skills table */
  structuredSkills: { code: string; level: number; is_primary: boolean }[];
  /** Legacy competences from rh_competencies */
  legacyCompetences: string[];
}

export interface CompetenceMatchResult {
  techCompetences: Map<number, string[]>;
  techRoster: Map<number, { name: string; collaboratorId: string }>;
  isCompatible: (apogeeUserId: number, universes: string[]) => boolean;
  getMatchedCompetences: (apogeeUserId: number, universes: string[]) => string[];
  isLoading: boolean;
}

// ============================================================================
// MAPPING compétence catalogue → slugs univers Apogée
// ============================================================================

const COMPETENCE_TO_UNIVERS: Record<string, string[]> = {
  'plomberie':            ['plomberie', 'sanitaire', 'sanitaires', 'plomb'],
  'electricite':          ['electricite', 'elec', 'electrique'],
  'serrurerie':           ['serrurerie', 'serrure', 'serrurier', 'serr'],
  'vitrerie':             ['vitrerie', 'vitre', 'vitres', 'vitrier', 'miroiterie', 'vitr'],
  'menuiserie':           ['menuiserie', 'menuisier', 'bois', 'porte', 'portes', 'fenetre', 'fenetres'],
  'chauffage':            ['chauffage', 'chaudiere', 'climatisation', 'clim', 'cvc', 'pac', 'pompe_a_chaleur'],
  'volet_roulant':        ['volet_roulant', 'volets_roulants', 'volet', 'volets', 'store', 'stores', 'tablier', 'tabliers'],
  'pmr':                  ['pmr', 'amelioration_logement', 'ame_logement', 'pmr_amenagement', 'accessibilite'],
  'renovation':           ['renovation', 'reno', 'travaux'],
  'multiservices':        ['multiservices', 'multi'],
  'peinture':             ['peinture', 'peintre', 'revetement'],
  'carrelage':            ['carrelage', 'faience', 'carreleur'],
  'recherche_fuite':      ['recherche_fuite', 'recherche_de_fuite', 'fuite'],
  'platrerie':            ['platrerie', 'platre', 'platrier'],
};

// ============================================================================
// NORMALISATION
// ============================================================================

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Build reverse map: slug univers → set of competence codes
const UNIVERS_TO_COMPETENCES = new Map<string, Set<string>>();
for (const [compCode, universSlugs] of Object.entries(COMPETENCE_TO_UNIVERS)) {
  for (const slug of universSlugs) {
    const normSlug = normalizeSlug(slug);
    if (!UNIVERS_TO_COMPETENCES.has(normSlug)) {
      UNIVERS_TO_COMPETENCES.set(normSlug, new Set());
    }
    UNIVERS_TO_COMPETENCES.get(normSlug)!.add(compCode);
  }
}

/**
 * Check if a competence code matches a universe slug
 */
function codeMatchesUnivers(competenceCode: string, universSlug: string): boolean {
  const normCode = normalizeSlug(competenceCode);
  const normUni = normalizeSlug(universSlug);
  
  if (!normCode || !normUni) return false;
  
  // Direct match
  if (normCode === normUni) return true;
  
  // Lookup via mapping table
  const matchingComps = UNIVERS_TO_COMPETENCES.get(normUni);
  if (matchingComps?.has(normCode)) return true;
  
  // Check if the code has an entry in the forward map
  const directMatch = COMPETENCE_TO_UNIVERS[normCode];
  if (directMatch?.some(slug => normalizeSlug(slug) === normUni)) return true;
  
  // Fuzzy fallback
  const codeAlpha = normCode.replace(/[^a-z0-9]/g, '');
  const uniAlpha = normUni.replace(/[^a-z0-9]/g, '');
  return codeAlpha.length >= 3 && uniAlpha.length >= 3 && 
    (codeAlpha.includes(uniAlpha) || uniAlpha.includes(codeAlpha));
}

/** Check if a legacy competence label matches a universe slug */
function legacyLabelMatchesUnivers(label: string, universSlug: string): boolean {
  const normLabel = normalize(label);
  const normUni = normalizeSlug(universSlug);
  if (!normLabel || !normUni) return false;

  // Check forward map with fuzzy key match
  for (const [compKey, universSlugs] of Object.entries(COMPETENCE_TO_UNIVERS)) {
    if (normLabel === compKey || normLabel.includes(compKey) || compKey.includes(normLabel)) {
      if (universSlugs.some(s => normalizeSlug(s) === normUni)) return true;
    }
  }

  // Fuzzy
  const labelAlpha = normLabel.replace(/[^a-z0-9]/g, '');
  const uniAlpha = normUni.replace(/[^a-z0-9]/g, '');
  return labelAlpha.length >= 3 && uniAlpha.length >= 3 && 
    (labelAlpha.includes(uniAlpha) || uniAlpha.includes(labelAlpha));
}

// ============================================================================
// HOOK
// ============================================================================

export function useTechCompetenceMatch(agencyId: string | undefined): CompetenceMatchResult {
  // Load structured skills from technician_skills
  const { data: structuredData, isLoading: structuredLoading } = useQuery({
    queryKey: ['tech-structured-skills', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from('technician_skills' as any)
        .select(`
          collaborator_id,
          univers_code,
          level,
          is_primary
        `);
      if (error) throw error;
      return (data || []) as unknown as { collaborator_id: string; univers_code: string; level: number; is_primary: boolean }[];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });

  // Load collaborators with legacy competences
  const { data: collabData, isLoading: collabLoading } = useQuery({
    queryKey: ['tech-competences-collabs', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      const { data, error } = await supabase
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
      return data || [];
    },
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,
  });

  // Build structured skills map: collaborator_id → skills[]
  const skillsByCollaborator = useMemo(() => {
    const map = new Map<string, { code: string; level: number; is_primary: boolean }[]>();
    for (const s of structuredData || []) {
      if (!map.has(s.collaborator_id)) map.set(s.collaborator_id, []);
      map.get(s.collaborator_id)!.push({ code: s.univers_code, level: s.level, is_primary: s.is_primary });
    }
    return map;
  }, [structuredData]);

  // Merge into per-tech info
  const techInfos = useMemo(() => {
    return (collabData || []).map(c => {
      const apogeeId = c.apogee_user_id as number;
      const collabId = c.id;
      const structured = skillsByCollaborator.get(collabId) || [];
      const legacy = ((c as any).rh_competencies?.competences_techniques as string[]) || [];
      return {
        apogeeUserId: apogeeId,
        collaboratorId: collabId,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        structuredSkills: structured,
        legacyCompetences: legacy,
      } as TechCompetenceInfo;
    });
  }, [collabData, skillsByCollaborator]);

  const techCompetences = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const t of techInfos) {
      if (!t.apogeeUserId) continue;
      // Structured skills take priority; if none, fall back to legacy
      if (t.structuredSkills.length > 0) {
        map.set(t.apogeeUserId, t.structuredSkills.map(s => s.code));
      } else {
        map.set(t.apogeeUserId, t.legacyCompetences);
      }
    }
    return map;
  }, [techInfos]);

  const techRoster = useMemo(() => {
    const map = new Map<number, { name: string; collaboratorId: string }>();
    for (const t of techInfos) {
      if (t.apogeeUserId) {
        map.set(t.apogeeUserId, { name: t.name || `#${t.apogeeUserId}`, collaboratorId: t.collaboratorId });
      }
    }
    return map;
  }, [techInfos]);

  const isCompatible = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): boolean => {
      const comps = techCompetences.get(apogeeUserId);
      // No competences defined → compatible by default (allows adding skills later)
      if (!comps || comps.length === 0) return true;
      if (!universes || universes.length === 0) return true;
      
      const info = techInfos.find(t => t.apogeeUserId === apogeeUserId);
      const hasStructured = info && info.structuredSkills.length > 0;
      
      if (hasStructured) {
        // Structured: check code matches
        return universes.some(uni => 
          comps.some(code => codeMatchesUnivers(code, uni))
        );
      } else {
        // Legacy: check label matches
        return universes.some(uni => 
          comps.some(label => legacyLabelMatchesUnivers(label, uni))
        );
      }
    };
  }, [techCompetences, techInfos]);

  const getMatchedCompetences = useMemo(() => {
    return (apogeeUserId: number, universes: string[]): string[] => {
      const comps = techCompetences.get(apogeeUserId);
      if (!comps || !universes) return [];
      
      const info = techInfos.find(t => t.apogeeUserId === apogeeUserId);
      const hasStructured = info && info.structuredSkills.length > 0;
      
      if (hasStructured) {
        return comps.filter(code => universes.some(uni => codeMatchesUnivers(code, uni)));
      } else {
        return comps.filter(label => universes.some(uni => legacyLabelMatchesUnivers(label, uni)));
      }
    };
  }, [techCompetences, techInfos]);

  return { techCompetences, techRoster, isCompatible, getMatchedCompetences, isLoading: structuredLoading || collabLoading };
}