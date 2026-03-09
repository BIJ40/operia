/**
 * Hooks for managing sub-competencies (sous-compétences) per univers
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export interface SubSkill {
  id: string;
  univers_id: string;
  agency_id: string | null;
  label: string;
  is_default: boolean;
  created_at: string;
}

export interface CollaboratorSubSkill {
  id: string;
  collaborator_id: string;
  sub_skill_id: string;
  created_at: string;
}

/** All sub-skills visible to the current user (defaults + agency-specific) */
export function useSubSkills() {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['sub-skills', agencyId],
    queryFn: async (): Promise<SubSkill[]> => {
      const { data, error } = await supabase
        .from('competence_sub_skills')
        .select('*')
        .order('label');
      if (error) throw error;
      return (data ?? []) as SubSkill[];
    },
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Sub-skills assigned to a specific collaborator */
export function useCollaboratorSubSkills(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['collaborator-sub-skills', collaboratorId],
    queryFn: async (): Promise<CollaboratorSubSkill[]> => {
      if (!collaboratorId) return [];
      const { data, error } = await supabase
        .from('collaborator_sub_skills')
        .select('*')
        .eq('collaborator_id', collaboratorId);
      if (error) throw error;
      return (data ?? []) as CollaboratorSubSkill[];
    },
    enabled: !!collaboratorId,
  });
}

/** Add a new sub-skill to the catalogue */
export function useAddSubSkill() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();

  return useMutation({
    mutationFn: async ({ universId, label }: { universId: string; label: string }) => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase
        .from('competence_sub_skills')
        .insert({ univers_id: universId, agency_id: agencyId, label: label.trim(), is_default: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-skills'] });
      toast.success('Sous-compétence ajoutée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Delete a sub-skill from catalogue */
export function useDeleteSubSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competence_sub_skills')
        .delete()
        .eq('id', id)
        .eq('is_default', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-skills'] });
    },
  });
}

/** Toggle a sub-skill assignment for a collaborator */
export function useToggleCollaboratorSubSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaboratorId, subSkillId, assigned }: {
      collaboratorId: string;
      subSkillId: string;
      assigned: boolean;
    }) => {
      if (assigned) {
        // Remove
        const { error } = await supabase
          .from('collaborator_sub_skills')
          .delete()
          .eq('collaborator_id', collaboratorId)
          .eq('sub_skill_id', subSkillId);
        if (error) throw error;
      } else {
        // Add
        const { error } = await supabase
          .from('collaborator_sub_skills')
          .insert({ collaborator_id: collaboratorId, sub_skill_id: subSkillId });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['collaborator-sub-skills', vars.collaboratorId] });
    },
  });
}

/** Batch fetch all collaborator sub-skills for an agency (for matrix) */
export function useAllCollaboratorSubSkills(collaboratorIds: string[]) {
  return useQuery({
    queryKey: ['all-collaborator-sub-skills', collaboratorIds.sort().join(',')],
    queryFn: async (): Promise<CollaboratorSubSkill[]> => {
      if (collaboratorIds.length === 0) return [];
      const { data, error } = await supabase
        .from('collaborator_sub_skills')
        .select('*')
        .in('collaborator_id', collaboratorIds);
      if (error) throw error;
      return (data ?? []) as CollaboratorSubSkill[];
    },
    enabled: collaboratorIds.length > 0,
  });
}
