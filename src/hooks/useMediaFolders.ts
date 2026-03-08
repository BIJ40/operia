/**
 * Hook pour gérer les dossiers de la médiathèque
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MediaFolder, MediaBreadcrumb } from '@/types/mediaLibrary';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export function useMediaFolders(parentId: string | null = null) {
  const { agencyId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch folders for current parent
  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: ['media-folders', agencyId, parentId],
    queryFn: async () => {
      if (!agencyId) return [];

      let query = supabase
        .from('media_folders')
        .select('*')
        .eq('agency_id', agencyId)
        .is('deleted_at', null)
        .order('name')
        .limit(500);

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MediaFolder[];
    },
    enabled: !!agencyId,
  });

  // Fetch current folder details
  const { data: currentFolder } = useQuery({
    queryKey: ['media-folder', parentId],
    queryFn: async () => {
      if (!parentId) return null;

      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('id', parentId)
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    enabled: !!parentId,
  });

  // Build breadcrumb path
  const { data: breadcrumbs = [] } = useQuery({
    queryKey: ['media-breadcrumbs', parentId],
    queryFn: async () => {
      if (!parentId) return [];

      const path: MediaBreadcrumb[] = [];
      let currentId: string | null = parentId;

      while (currentId) {
        const { data, error } = await supabase
          .from('media_folders')
          .select('id, name, slug, parent_id')
          .eq('id', currentId)
          .single();

        if (error || !data) break;

        path.unshift({
          id: data.id,
          name: data.name,
          path: data.slug,
        });

        currentId = data.parent_id;
      }

      return path;
    },
    enabled: !!parentId,
  });

  // Create folder mutation
  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      if (!agencyId) throw new Error('Agency ID required');

      // Get parent scope for inheritance
      let accessScope: 'general' | 'rh' | 'rh_sensitive' | 'admin' = 'general';
      if (parentId) {
        const { data: parent } = await supabase
          .from('media_folders')
          .select('access_scope')
          .eq('id', parentId)
          .single();
        accessScope = parent?.access_scope || 'general';
      }

      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'dossier';

      const { data, error } = await supabase
        .from('media_folders')
        .insert({
          agency_id: agencyId,
          parent_id: parentId,
          name,
          slug,
          is_system: false,
          access_scope: accessScope,
          icon: 'folder',
          color: 'default',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders', agencyId] });
      toast.success('Dossier créé');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Un dossier avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la création du dossier');
      }
    },
  });

  // Rename folder mutation
  const renameFolder = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      const slug = newName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'dossier';

      const { data, error } = await supabase
        .from('media_folders')
        .update({ name: newName, slug })
        .eq('id', folderId)
        .eq('is_system', false) // Can't rename system folders
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier renommé');
    },
    onError: () => {
      toast.error('Impossible de renommer ce dossier');
    },
  });

  // Soft delete folder mutation
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('media_folders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', folderId)
        .eq('is_system', false); // Can't delete system folders

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier mis à la corbeille');
    },
    onError: () => {
      toast.error('Impossible de supprimer ce dossier');
    },
  });

  // Move folder mutation
  const moveFolder = useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      const { data, error } = await supabase
        .from('media_folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId)
        .eq('is_system', false) // Can't move system folders
        .select()
        .single();

      if (error) throw error;
      return data as MediaFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      toast.success('Dossier déplacé');
    },
    onError: () => {
      toast.error('Impossible de déplacer ce dossier');
    },
  });

  return {
    folders,
    currentFolder,
    breadcrumbs,
    isLoading,
    error,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
  };
}
