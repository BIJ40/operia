import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  isPaid: boolean;
  paidDate: Date | null;
  totalPaidCents: number;
}

/**
 * Hook pour vérifier si un dossier a un paiement enregistré
 * Utilise une edge function sécurisée avec vérification du code postal
 */
export function usePaymentStatus(
  refDossier: string | undefined,
  codePostal: string | undefined,
  agencySlug?: string
) {
  return useQuery<PaymentStatus>({
    queryKey: ['payment-status', refDossier, codePostal],
    queryFn: async () => {
      if (!refDossier || !codePostal) {
        return { isPaid: false, paidDate: null, totalPaidCents: 0 };
      }

      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: {
          refDossier,
          codePostal,
          agencySlug,
        },
      });

      if (error) {
        console.error('Error checking payment status:', error);
        return { isPaid: false, paidDate: null, totalPaidCents: 0 };
      }

      if (data.error) {
        console.error('Payment status check denied:', data.error);
        return { isPaid: false, paidDate: null, totalPaidCents: 0 };
      }

      return {
        isPaid: data.isPaid || false,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        totalPaidCents: data.totalPaidCents || 0,
      };
    },
    enabled: !!refDossier && !!codePostal,
    staleTime: 30000, // 30 secondes
  });
}
