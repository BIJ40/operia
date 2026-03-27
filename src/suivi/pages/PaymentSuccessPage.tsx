import React from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

/**
 * Page de retour après paiement Stripe réussi
 * 
 * NOTE: Cette page est affichée après la redirection Stripe Checkout.
 * Le paiement est automatiquement enregistré via le hook usePaymentCallback.
 */
const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const refDossier = searchParams.get('ref') || 'N/A';

  // URL de retour vers le dossier
  const returnUrl = agencySlug ? `/${agencySlug}/${refDossier}` : `/${refDossier}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg border-green-200 dark:border-green-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-700 dark:text-green-400">
            Paiement initié
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Votre règlement pour le dossier{' '}
              <span className="font-semibold text-foreground">{refDossier}</span>{' '}
              a bien été pris en compte.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Mail className="h-4 w-4" />
              <span>Conservez bien l'email de confirmation Stripe.</span>
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

export default PaymentSuccessPage;
