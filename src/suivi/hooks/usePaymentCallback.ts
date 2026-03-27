import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook pour gérer le callback de paiement Stripe
 * Détecte les paramètres payment=success et session_id dans l'URL,
 * appelle l'edge function pour enregistrer le paiement, puis nettoie l'URL
 */
export function usePaymentCallback(refDossier: string | undefined, agencySlug?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    // Gérer le cas d'annulation
    if (paymentStatus === 'cancelled') {
      toast.info('Paiement annulé', {
        description: 'Le paiement a été annulé. Vous pouvez réessayer à tout moment.',
      });
      // Nettoyer l'URL
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    // Gérer le cas de succès
    if (paymentStatus === 'success' && sessionId && refDossier && !isProcessing) {
      setIsProcessing(true);

      const recordPayment = async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId,
                refDossier,
                agencySlug: agencySlug || 'dax',
              }),
            }
          );

          const result = await response.json();

          if (result.success) {
            toast.success('Paiement confirmé !', {
              description: 'Votre paiement a bien été enregistré. Merci.',
              duration: 5000,
            });
            // Invalider le cache pour rafraîchir le statut de paiement
            queryClient.invalidateQueries({ queryKey: ['payment-status', refDossier] });
          } else if (result.alreadyRecorded) {
            // Déjà enregistré, pas besoin de toast
          } else {
            console.error('Error recording payment:', result.error);
            toast.warning('Paiement en cours de traitement', {
              description: 'Votre paiement sera confirmé sous peu.',
            });
          }
        } catch (error) {
          console.error('Error calling record-payment:', error);
          toast.warning('Paiement en cours de traitement', {
            description: 'Votre paiement sera confirmé sous peu.',
          });
        } finally {
          // Nettoyer l'URL
          searchParams.delete('payment');
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
          setIsProcessing(false);
        }
      };

      recordPayment();
    }
  }, [searchParams, setSearchParams, refDossier, agencySlug, isProcessing, queryClient]);

  return { isProcessing };
}
