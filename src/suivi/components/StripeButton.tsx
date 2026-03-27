import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentStatus } from '@/hooks/suivi/usePaymentStatus';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StripeButtonProps {
  refDossier: string;
  agencySlug: string;
  verifiedPostalCode?: string;
  disabled?: boolean;
}

/**
 * Bouton de paiement Stripe Checkout
 * Redirige vers la page de paiement Stripe pour un règlement direct par carte bancaire
 * SÉCURITÉ: Le montant est calculé côté serveur depuis Apogée - jamais envoyé par le client
 */
export const StripeButton: React.FC<StripeButtonProps> = ({
  refDossier,
  agencySlug,
  verifiedPostalCode,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { data: paymentStatus, isLoading: isCheckingPayment } = usePaymentStatus(refDossier, verifiedPostalCode, agencySlug);

  // Si le paiement a déjà été effectué, afficher le badge "Réglé"
  if (paymentStatus?.isPaid && paymentStatus.paidDate) {
    const formattedDate = format(paymentStatus.paidDate, 'dd/MM/yyyy', { locale: fr });
    return (
      <Badge 
        variant="outline" 
        className="gap-1.5 border-green-500/50 bg-green-50 text-green-700 
          dark:bg-green-900/30 dark:text-green-400 text-[10px] md:text-xs
          cursor-default select-none"
      >
        <CheckCircle2 className="h-3 w-3" />
        <span>Réglé le {formattedDate}</span>
      </Badge>
    );
  }

  const handleStripeClick = async () => {
    if (disabled || !verifiedPostalCode) {
      toast.error('Impossible de procéder au paiement');
      return;
    }

    setIsLoading(true);

    try {
      // SECURITY: Amount is NOT sent - calculated server-side from Apogée
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout?agencySlug=${encodeURIComponent(agencySlug)}&refDossier=${encodeURIComponent(refDossier)}&codePostal=${encodeURIComponent(verifiedPostalCode)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        switch (errorData.error) {
          case 'STRIPE_NOT_CONFIGURED':
            toast.error('Le paiement en ligne n\'est pas encore disponible.');
            break;
          case 'ACCESS_DENIED':
            toast.error('Accès refusé. Veuillez rafraîchir la page.');
            break;
          case 'NO_AMOUNT_DUE':
            toast.error('Aucun montant à payer pour ce dossier.');
            break;
          default:
            toast.error('Erreur lors de la préparation du paiement. Veuillez réessayer.');
        }
        return;
      }

      const result = await response.json();

      if (result.url) {
        // Ouvrir Stripe Checkout dans un nouvel onglet pour une meilleure UX
        // Cela permet à l'utilisateur de revenir à l'application en cas de problème
        const stripeWindow = window.open(result.url, '_blank');
        
        if (!stripeWindow) {
          // Si le popup est bloqué, fallback vers redirection
          toast.info('Redirection vers la page de paiement...');
          window.location.href = result.url;
        } else {
          toast.success('La page de paiement s\'est ouverte dans un nouvel onglet');
        }
      } else {
        toast.error('Impossible de générer le lien de paiement.');
      }
    } catch (error) {
      console.error('Stripe button error:', error);
      toast.error('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStripeClick}
      disabled={disabled || isLoading || isCheckingPayment || !verifiedPostalCode}
      variant="outline"
      size="sm"
      className="gap-1.5 border-green-500/30 bg-green-50 hover:bg-green-100 
        text-green-700 hover:text-green-800 text-[10px] md:text-xs
        dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400"
    >
      {isLoading || isCheckingPayment ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Chargement...</span>
        </>
      ) : (
        <>
          <CreditCard className="h-3 w-3" />
          <span className="hidden sm:inline">Payer par carte</span>
          <span className="sm:hidden">CB</span>
        </>
      )}
    </Button>
  );
};