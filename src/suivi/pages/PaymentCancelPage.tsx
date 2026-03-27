import React from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Phone } from 'lucide-react';

/**
 * Page de retour après annulation du paiement Stripe
 * 
 * Affichée quand l'utilisateur annule ou quitte Stripe Checkout sans payer.
 */
const PaymentCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const refDossier = searchParams.get('ref') || 'N/A';

  // URL de retour vers le dossier
  const returnUrl = agencySlug ? `/${agencySlug}/${refDossier}` : `/${refDossier}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-amber-200 dark:border-amber-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
            <XCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-amber-700 dark:text-amber-400">
            Paiement annulé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Le paiement pour le dossier{' '}
              <span className="font-semibold text-foreground">{refDossier}</span>{' '}
              a été annulé ou interrompu.
            </p>
            
            <p className="text-sm text-muted-foreground">
              La facture reste impayée. Vous pouvez réessayer à tout moment depuis votre espace de suivi.
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Phone className="h-4 w-4" />
              <span>En cas de difficulté, contactez votre agence.</span>
            </div>
          </div>

          <div className="pt-4">
            <Link to={returnUrl}>
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour au dossier
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelPage;
