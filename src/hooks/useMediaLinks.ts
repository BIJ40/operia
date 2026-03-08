/**
 * Hook pour gérer les liens (fichiers) de la médiathèque
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MediaLink, MediaAsset, MediaLinkWithAsset, SignedUrlResponse } from '@/types/mediaLibrary';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export function useMediaLinks(folderId: string | null = null) {
  const { agencyId } = useProfile();
  const queryClient = useQueryClient();

  // Fetch links (files) in current folder
  const { data: links = [], isLoading, error } = useQuery({
    queryKey: ['media-links', agencyId, folderId],
    queryFn: async () => {
      if (!agencyId || !folderId) return [];

      const { data, error } = await supabase
        .from('media_links')
        .select(`
          *,
          asset:media_assets(*)
        `)
        .eq('agency_id', agencyId)
        .eq('folder_id', folderId)
        .is('deleted_at', null)
        .order('sort_order', { nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out links without assets and cast to proper type
      return (data || [])
        .filter(item => item.asset)
        .map(item => ({
          ...item,
          asset: item.asset as MediaAsset,
        })) as MediaLinkWithAsset[];
    },
    enabled: !!agencyId && !!folderId,
  });

  // Upload file mutation
  const uploadFile = useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId: string }) => {
      if (!agencyId) throw new Error('Agency ID required');

      // 1. Upload to storage
      const timestamp = Date.now();
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${agencyId}/${folderId}/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // 2. Create asset record
      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .insert({
          agency_id: agencyId,
          storage_bucket: 'media-library',
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          metadata: {},
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // 3. Create link record
      const { data: link, error: linkError } = await supabase
        .from('media_links')
        .insert({
          agency_id: agencyId,
          asset_id: asset.id,
          folder_id: folderId,
          label: file.name,
        })
        .select()
        .single();

      if (linkError) throw linkError;

      return { asset, link };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links', agencyId] });
      toast.success('Fichier téléversé');
    },
    onError: () => {
      toast.error('Erreur lors du téléversement');
    },
  });

  // Rename file (link label)
  const renameFile = useMutation({
    mutationFn: async ({ linkId, newName }: { linkId: string; newName: string }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ label: newName })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data as MediaLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier renommé');
    },
    onError: () => {
      toast.error('Erreur lors du renommage');
    },
  });

  // Soft delete file (link)
  const deleteFile = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('media_links')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier mis à la corbeille');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  // Move file to another folder
  const moveFile = useMutation({
    mutationFn: async ({ linkId, newFolderId }: { linkId: string; newFolderId: string }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ folder_id: newFolderId })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data as MediaLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
      toast.success('Fichier déplacé');
    },
    onError: () => {
      toast.error('Erreur lors du déplacement');
    },
  });

  // Get signed URL for download
  const getSignedUrl = async (assetId: string, linkId?: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke<SignedUrlResponse>(
        'media-get-signed-url',
        {
          body: { asset_id: assetId, link_id: linkId },
        }
      );

      if (error || !data?.success) {
        toast.error(data?.error || 'Erreur lors du téléchargement');
        return null;
      }

      return data.url || null;
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
      return null;
    }
  };

  // Download file
  const downloadFile = async (link: MediaLinkWithAsset) => {
    const url = await getSignedUrl(link.asset_id, link.id);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = link.label || link.asset.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Update sort order
  const updateSortOrder = useMutation({
    mutationFn: async ({ linkId, sortOrder }: { linkId: string; sortOrder: number }) => {
      const { data, error } = await supabase
        .from('media_links')
        .update({ sort_order: sortOrder })
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;
      return data as MediaLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-links'] });
    },
  });

  return {
    links,
    isLoading,
    error,
    uploadFile,
    renameFile,
    deleteFile,
    moveFile,
    downloadFile,
    getSignedUrl,
    updateSortOrder,
  };
}
