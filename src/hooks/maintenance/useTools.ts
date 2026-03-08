/**
 * Hook pour la gestion des outils / EPI / matériel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';
import type { Tool, ToolsFilters, ToolFormData } from '@/types/maintenance';

const QUERY_KEY = 'tools';

export function useTools(agencyIdParam?: string, filters?: ToolsFilters) {
  const { agencyId } = useProfile();
  const effectiveAgencyId = agencyIdParam || agencyId;

  return useQuery({
    queryKey: [QUERY_KEY, effectiveAgencyId, filters],
    queryFn: async (): Promise<Tool[]> => {
      let query = supabase
        .from('tools')
        .select(`
          *,
          collaborator:collaborators!assigned_collaborator_id(id, first_name, last_name),
          plan_template:maintenance_plan_templates!default_plan_template_id(id, name, target_type)
        `)
        .order('label', { ascending: true });

      // Filtre agence si spécifié
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }

      // Filtres optionnels
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.collaboratorId) {
        query = query.eq('assigned_collaborator_id', filters.collaboratorId);
      }
      if (filters?.search) {
        query = query.or(`label.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }

      const result = await safeQuery<Tool[]>(query, 'TOOLS_FETCH');
      if (!result.success) {
        logError('[useTools] Erreur fetch', result.error);
        return [];
      }

      return result.data || [];
    },
    enabled: !!effectiveAgencyId,
  });
}

export function useTool(toolId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', toolId],
    queryFn: async (): Promise<Tool | null> => {
      if (!toolId) return null;

      const result = await safeQuery<Tool[]>(
        supabase
          .from('tools')
          .select(`
            *,
            collaborator:collaborators!assigned_collaborator_id(id, first_name, last_name),
            plan_template:maintenance_plan_templates!default_plan_template_id(id, name, target_type)
          `)
          .eq('id', toolId)
          .limit(1),
        'TOOL_DETAIL'
      );

      if (!result.success || !result.data?.length) {
        return null;
      }
      return result.data[0];
    },
    enabled: !!toolId,
  });
}

export function useCreateTool() {
  const queryClient = useQueryClient();
  const { agencyId } = useAuth();

  return useMutation({
    mutationFn: async (data: ToolFormData) => {
      if (!agencyId) throw new Error('Agence non définie');

      const result = await safeMutation<Tool[]>(
        supabase
          .from('tools')
          .insert({
            agency_id: agencyId,
            ...data,
            qr_token: crypto.randomUUID(),
          })
          .select(),
        'TOOL_CREATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur création outil');
      }
      return result.data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ toolId, data }: { toolId: string; data: Partial<ToolFormData> }) => {
      const result = await safeMutation<Tool[]>(
        supabase
          .from('tools')
          .update(data)
          .eq('id', toolId)
          .select(),
        'TOOL_UPDATE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur mise à jour outil');
      }
      return result.data?.[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', variables.toolId] });
    },
  });
}

export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string) => {
      const result = await safeMutation(
        supabase
          .from('tools')
          .delete()
          .eq('id', toolId),
        'TOOL_DELETE'
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Erreur suppression outil');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
