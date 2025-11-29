/**
 * Hook V2 pour charger les agents support assignables
 * 
 * Un agent support est défini par:
 * - profiles.enabled_modules.support.enabled = true
 * - ET (options.agent_support = true OU options.admin_support = true)
 * 
 * Ne plus utiliser support_level ou autres attributs legacy.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupportAgent {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  agence: string | null;
  global_role: string | null;
  // Options support V2
  isAgent: boolean;
  isAdmin: boolean;
  level: number | null;
  skills: string[];
}

interface EnabledModules {
  support?: {
    enabled?: boolean;
    options?: {
      agent_support?: boolean;
      admin_support?: boolean;
      level?: number;
      skills?: string[];
    };
  };
  [key: string]: any;
}

/**
 * Hook pour récupérer la liste des agents support V2
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
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, agence, global_role, enabled_modules')
        .eq('is_active', true);

      if (queryError) throw queryError;

      // Filtrer les profils qui sont des agents support V2
      const supportAgents: SupportAgent[] = (data || [])
        .filter(profile => {
          const modules = profile.enabled_modules as EnabledModules | null;
          if (!modules?.support?.enabled) return false;
          
          const options = modules.support.options || {};
          return options.agent_support === true || options.admin_support === true;
        })
        .map(profile => {
          const modules = profile.enabled_modules as EnabledModules;
          const options = modules.support?.options || {};
          
          return {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            agence: profile.agence,
            global_role: profile.global_role,
            isAgent: options.agent_support === true,
            isAdmin: options.admin_support === true,
            level: options.level ?? null,
            skills: options.skills ?? [],
          };
        });

      setAgents(supportAgents);
    } catch (err) {
      console.error('Error loading support agents:', err);
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
