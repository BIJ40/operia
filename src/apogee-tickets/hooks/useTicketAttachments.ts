/**
 * Hook pour gérer les pièces jointes des tickets Apogée
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logWarn } from '@/lib/logger';

export type TicketAttachmentSource = 'db' | 'storage';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  file_url?: string;
  source: TicketAttachmentSource;
  is_missing?: boolean;
}

export function useTicketAttachments(ticketId: string | null) {
  const queryClient = useQueryClient();

  // Récupérer les pièces jointes
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['apogee-ticket-attachments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const [{ data, error }, { data: storageFiles, error: storageError }] = await Promise.all([
        supabase
          .from('apogee_ticket_attachments')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false }),
        supabase.storage
          .from('apogee-ticket-attachments')
          .list(ticketId, { sortBy: { column: 'created_at', order: 'desc' } }),
      ]);

      if (error) throw error;
      if (storageError) {
        logWarn('APOGEE_TICKETS', 'Erreur listing storage pièces jointes', { storageError, ticketId });
      }

      const validStorageFiles = (storageFiles || []).filter(
        (file) => file.name && !file.name.startsWith('.') && file.id
      );
      const storagePaths = new Set(validStorageFiles.map((file) => `${ticketId}/${file.name}`));
      const dbPaths = new Set((data || []).map((att) => att.file_path));

      // Générer les URLs signées pour les pièces jointes référencées en base
      const attachmentsFromDb = await Promise.all(
        (data || []).map(async (att) => {
          const hasStorageObject = storagePaths.has(att.file_path);
          const { data: urlData } = hasStorageObject
            ? await supabase.storage
                .from('apogee-ticket-attachments')
                .createSignedUrl(att.file_path, 3600)
            : { data: null };

          return {
            ...att,
            file_url: urlData?.signedUrl || '',
            source: 'db' as const,
            is_missing: !hasStorageObject,
          };
        })
      );

      // Inclure aussi les fichiers présents en storage mais absents de la table SQL
      const storageOnlyAttachments = await Promise.all(
        validStorageFiles
          .filter((file) => !dbPaths.has(`${ticketId}/${file.name}`))
          .map(async (file) => {
            const fullPath = `${ticketId}/${file.name}`;
            const { data: urlData } = await supabase.storage
              .from('apogee-ticket-attachments')
              .createSignedUrl(fullPath, 3600);

            return {
              id: `storage:${fullPath}`,
              ticket_id: ticketId,
              file_name: file.name,
              file_path: fullPath,
              file_size: file.metadata?.size || null,
              file_type: file.metadata?.mimetype || null,
              uploaded_by: null,
              created_at: file.created_at,
              file_url: urlData?.signedUrl || '',
              source: 'storage' as const,
              is_missing: false,
            } satisfies TicketAttachment;
          })
      );

      return [...attachmentsFromDb, ...storageOnlyAttachments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) as TicketAttachment[];
    },
    enabled: !!ticketId,
  });

  // Upload d'un fichier
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ticketId) throw new Error('Ticket ID manquant');

      const { data: { user } } = await supabase.auth.getUser();
      
      // Générer un chemin unique
      const fileExt = file.name.split('.').pop();
      const filePath = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('apogee-ticket-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Créer l'entrée en base
      const { error: dbError } = await supabase
        .from('apogee_ticket_attachments')
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
        });

      if (dbError) {
        // Rollback storage si erreur DB
        await supabase.storage.from('apogee-ticket-attachments').remove([filePath]);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-attachments', ticketId] });
      toast.success('Fichier ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Supprimer un fichier
  const deleteMutation = useMutation({
    mutationFn: async ({
      attachmentId,
      filePath,
      source,
    }: {
      attachmentId: string;
      filePath: string;
      source: TicketAttachmentSource;
    }) => {
      if (source === 'storage') {
        const { error: storageError } = await supabase.storage
          .from('apogee-ticket-attachments')
          .remove([filePath]);

        if (storageError) throw storageError;
        return;
      }

      // Supprimer de la DB
      const { error: dbError } = await supabase
        .from('apogee_ticket_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('apogee-ticket-attachments')
        .remove([filePath]);

      if (storageError) {
        logWarn('APOGEE_TICKETS', 'Erreur suppression storage', { storageError });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apogee-ticket-attachments', ticketId] });
      toast.success('Fichier supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    attachments,
    isLoading,
    uploadAttachment: uploadMutation.mutateAsync,
    deleteAttachment: (id: string, filePath: string, source: TicketAttachmentSource = 'db') => 
      deleteMutation.mutate({ attachmentId: id, filePath, source }),
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
