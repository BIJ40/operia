/**
 * Hook pour gérer les pièces jointes des tickets Apogée
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logWarn } from '@/lib/logger';

interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  file_url?: string;
}

export function useTicketAttachments(ticketId: string | null) {
  const queryClient = useQueryClient();

  // Récupérer les pièces jointes
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['apogee-ticket-attachments', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('apogee_ticket_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Générer les URLs signées pour chaque fichier
      const attachmentsWithUrls = await Promise.all(
        (data || []).map(async (att) => {
          const { data: urlData } = await supabase.storage
            .from('apogee-ticket-attachments')
            .createSignedUrl(att.file_path, 3600); // URL valide 1h

          return {
            ...att,
            file_url: urlData?.signedUrl || '',
          };
        })
      );

      return attachmentsWithUrls as TicketAttachment[];
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
    mutationFn: async ({ attachmentId, filePath }: { attachmentId: string; filePath: string }) => {
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
    deleteAttachment: (id: string, filePath: string) => 
      deleteMutation.mutate({ attachmentId: id, filePath }),
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
