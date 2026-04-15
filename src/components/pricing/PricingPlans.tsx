/**
 * PricingPlans — Affichage des 2 plans Stripe avec boutons d'abonnement
 */
import { Check, BarChart3, Handshake, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAgencySubscriptions } from '@/hooks/useAgencySubscriptions';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useState } from 'react';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'pilotage' as const,
    title: 'Pilotage',
    priceHT: 60,
    priceTTC: 72,
    icon: BarChart3,
    description: 'Statistiques complètes & veille apporteurs',
    features: [
      'Tableau de bord statistiques',
      'Veille apporteurs & prescripteurs',
      'Cartographie & zones',
      'Comparateur de performance',
    ],
  },
  {
    key: 'suivi' as const,
    title: 'Suivi & Espace Apporteurs',
    priceHT: 70,
    priceTTC: 84,
    icon: Handshake,
    description: 'Suivi client & portail apporteurs',
    features: [
      'Suivi client en temps réel',
      'Espace apporteurs dédié',
      'Échanges & notifications',
      'Portail personnalisé',
    ],
  },
];

export function PricingPlans() {
  const { hasPilotage, hasSuivi, isLoading } = useAgencySubscriptions();
  const { agencyId } = useProfile();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const isSubscribed = (key: string) => {
    if (key === 'pilotage') return hasPilotage;
    if (key === 'suivi') return hasSuivi;
    return false;
  };

  const handleSubscribe = async (planKey: string) => {
    if (!agencyId) {
      toast.error('Aucune agence associée à votre compte');
      return;
    }
    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan_key: planKey, agency_id: agencyId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création de la session de paiement');
    } finally {
      setLoadingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Débloquez tout le potentiel d'Operia</h2>
        <p className="text-muted-foreground">Choisissez les modules qui correspondent à vos besoins</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {PLANS.map((plan) => {
          const active = isSubscribed(plan.key);
          const Icon = plan.icon;
          return (
            <Card key={plan.key} className={`relative overflow-hidden transition-shadow ${active ? 'border-primary shadow-lg' : 'hover:shadow-md'}`}>
              {active && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">Actif</Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.title}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.priceHT}€</span>
                  <span className="text-muted-foreground ml-1">HT/mois</span>
                  <span className="text-sm text-muted-foreground ml-2">({plan.priceTTC}€ TTC)</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {active ? (
                  <Button variant="outline" className="w-full" disabled>
                    Abonnement actif
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === plan.key ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    S'abonner
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
