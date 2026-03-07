/**
 * Hook V2 pour charger les agents support assignables
 * 
 * Un agent support est défini par:
 * - user_modules avec module_key = 'aide' et options.agent = true
 * 
 * Source de vérité: table user_modules (pas profiles.enabled_modules)
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export interface SupportAgent {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: string | null;
  isAgent: boolean;
  isAdmin: boolean;
  level: number | null;
  skills: string[];
}

/**
 * Hook pour récupérer la liste des agents support via user_modules
 */
export function useSupportAgents() {
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Chercher les user_modules avec aide.agent = true
      const { data: moduleRows, error: modulesError } = await supabase
        .from('user_modules')
        .select('user_id, options')
        .eq('module_key', 'aide');

      if (modulesError) throw modulesError;

      // Filtrer ceux qui ont agent: true
      const agentUserIds = (moduleRows || [])
        .filter(row => {
          const opts = row.options as Record<string, boolean> | null;
          return opts?.agent === true;
        })
        .map(row => row.user_id);

      if (agentUserIds.length === 0) {
        setAgents([]);
        return;
      }

      // Charger les profils correspondants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, support_level')
        .in('id', agentUserIds)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Construire les agents
      const optionsMap = new Map(
        (moduleRows || []).map(r => [r.user_id, r.options as Record<string, any> | null])
      );

      const supportAgents: SupportAgent[] = (profiles || []).map(profile => {
        const opts = optionsMap.get(profile.id) || {};
        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          agence: profile.agence,
          global_role: profile.global_role,
          isAgent: opts.agent === true,
          isAdmin: opts.admin === true,
          level: (profile as any).support_level ?? opts.level ?? null,
          skills: opts.skills ?? [],
        };
      });

      setAgents(supportAgents);
    } catch (err) {
      logError('SUPPORT_AGENTS', 'Erreur chargement agents support', { error: err });
      setError('Erreur lors du chargement des agents support');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    agents,
    isLoading,
    error,
    reload: loadAgents,
  };
}

/**
 * Helper pour obtenir le nom complet d'un agent
 */
export function getAgentDisplayName(agent: SupportAgent): string {
  if (agent.first_name && agent.last_name) {
    return `${agent.first_name} ${agent.last_name}`;
  }
  if (agent.first_name) return agent.first_name;
  if (agent.last_name) return agent.last_name;
  return agent.email || 'Agent inconnu';
}

/**
 * Helper pour filtrer les agents par compétence
 */
export function filterAgentsBySkill(agents: SupportAgent[], skill: string): SupportAgent[] {
  return agents.filter(agent => agent.skills.includes(skill));
}

/**
 * Helper pour filtrer les agents par niveau
 */
export function filterAgentsByLevel(agents: SupportAgent[], minLevel: number): SupportAgent[] {
  return agents.filter(agent => (agent.level ?? 1) >= minLevel);
}
