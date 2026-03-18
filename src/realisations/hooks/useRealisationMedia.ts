/**
 * Hook — Media for a realisation + upload
 * Uses 'any' cast for new tables not yet in generated types
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { RealisationMedia, MediaRole } from '../types';
import { toast } from 'sonner';

const db = supabase as any;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4']);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function useRealisationMedia(realisationId: string | undefined) {
  return useQuery({
    queryKey: ['realisation-media', realisationId],
    queryFn: async (): Promise<RealisationMedia[]> => {
      if (!realisationId) return [];
      const { data, error } = await db
        .from('realisation_media')
        .select('*')
        .eq('realisation_id', realisationId)
        .order('media_role')
        .order('sequence_order');
      if (error) throw error;

      const items = (data || []) as RealisationMedia[];
      const withUrls = await Promise.all(
        items.map(async (item) => {
          const { data: urlData } = await supabase.storage
            .from('realisations-private')
            .createSignedUrl(item.storage_path, 3600);
          return { ...item, signedUrl: urlData?.signedUrl || '' };
        })
      );
      return withUrls;
    },
    enabled: !!realisationId,
    staleTime: 1000 * 60,
  });
}

interface UploadMediaParams {
  realisationId: string;
  agencyId: string;
  file: File;
  mediaRole: MediaRole;
  sequenceOrder?: number;
}

export function useUploadMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ realisationId, agencyId, file, mediaRole, sequenceOrder = 0 }: UploadMediaParams) => {
      if (!ALLOWED_TYPES.has(file.type)) throw new Error(`Type non autorisé: ${file.type}`);
      if (file.size > MAX_FILE_SIZE) throw new Error('Fichier trop volumineux (max 50 Mo)');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `agency/${agencyId}/realisation/${realisationId}/original/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('realisations-private')
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const { data, error } = await db
        .from('realisation_media')
        .insert({
          realisation_id: realisationId,
          agency_id: agencyId,
          storage_path: storagePath,
          file_name: fileName,
          original_file_name: file.name,
          mime_type: file.type,
          media_type: mediaType,
          media_role: mediaRole,
          sequence_order: sequenceOrder,
          file_size_bytes: file.size,
        })
        .select()
        .single();
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await db.from('realisation_activity_log').insert({
        agency_id: agencyId,
        realisation_id: realisationId,
        actor_type: 'user',
        actor_user_id: user?.id,
        action_type: 'media_uploaded',
        action_payload: { file_name: file.name, media_role: mediaRole },
      });

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['realisation-media', vars.realisationId] });
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Média ajouté');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur upload'),
  });
}

export function useUpdateMediaRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, realisationId, newRole }: { mediaId: string; realisationId: string; newRole: MediaRole }) => {
      const { error } = await db
        .from('realisation_media')
        .update({ media_role: newRole })
        .eq('id', mediaId);
      if (error) throw error;
      return { mediaId, realisationId, newRole };
    },
    onMutate: async (vars) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ['realisation-media', vars.realisationId] });
      // Optimistic update
      const prev = qc.getQueryData<RealisationMedia[]>(['realisation-media', vars.realisationId]);
      if (prev) {
        qc.setQueryData<RealisationMedia[]>(
          ['realisation-media', vars.realisationId],
          prev.map(m => m.id === vars.mediaId ? { ...m, media_role: vars.newRole } : m),
        );
      }
      return { prev };
    },
    onError: (_err, vars, context) => {
      if (context?.prev) {
        qc.setQueryData(['realisation-media', vars.realisationId], context.prev);
      }
      toast.error('Erreur mise à jour du tag');
    },
    onSuccess: () => {
      toast.success('Tag mis à jour');
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ['realisation-media', vars.realisationId] });
      qc.invalidateQueries({ queryKey: ['realisations'] });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (media: RealisationMedia) => {
      await supabase.storage.from('realisations-private').remove([media.storage_path]);
      const { error } = await db.from('realisation_media').delete().eq('id', media.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await db.from('realisation_activity_log').insert({
        agency_id: media.agency_id,
        realisation_id: media.realisation_id,
        actor_type: 'user',
        actor_user_id: user?.id,
        action_type: 'media_deleted',
        action_payload: { file_name: media.file_name, media_role: media.media_role },
      });
    },
    onSuccess: (_, media) => {
      qc.invalidateQueries({ queryKey: ['realisation-media', media.realisation_id] });
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Média supprimé');
    },
    onError: () => toast.error('Erreur suppression'),
  });
}
