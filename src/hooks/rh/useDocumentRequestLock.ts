import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LockResult {
  success: boolean;
  error?: string;
  locked_by?: string;
  locked_at?: string;
}

export function useLockDocumentRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string): Promise<LockResult> => {
      const { data, error } = await supabase
        .rpc('lock_document_request', { p_request_id: requestId });

      if (error) throw error;
      return data as unknown as LockResult;
    },
    onSuccess: (data, requestId) => {
      if (!data.success) {
        toast({
          title: "Impossible de verrouiller",
          description: data.error || "Cette demande est en cours de traitement",
          variant: "destructive"
        });
      }
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de verrouiller la demande",
        variant: "destructive"
      });
    }
  });
}

export function useUnlockDocumentRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (requestId: string): Promise<LockResult> => {
      const { data, error } = await supabase
        .rpc('unlock_document_request', { p_request_id: requestId });

      if (error) throw error;
      return data as unknown as LockResult;
    },
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          title: "Erreur",
          description: data.error,
          variant: "destructive"
        });
      }
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de déverrouiller la demande",
        variant: "destructive"
      });
    }
  });
}

// Helper pour vérifier si un lock est expiré (15 min)
export function isLockExpired(lockedAt: string | null): boolean {
  if (!lockedAt) return true;
  const lockTime = new Date(lockedAt).getTime();
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  return (now - lockTime) > fifteenMinutes;
}

// Helper pour formater le temps restant du lock
export function getLockTimeRemaining(lockedAt: string | null): string {
  if (!lockedAt) return '';
  const lockTime = new Date(lockedAt).getTime();
  const expiresAt = lockTime + (15 * 60 * 1000);
  const remaining = expiresAt - Date.now();
  
  if (remaining <= 0) return 'Expiré';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
