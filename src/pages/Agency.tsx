/**
 * Agency Page - Informations de l'agence de rattachement
 */

import { useEffect } from 'react';
import { useAuthCore } from "@/contexts/AuthCoreContext";
import { useProfile } from "@/contexts/ProfileContext";
import { WarmCard } from "@/components/ui/warm-card";
import { WarmPageContainer } from "@/components/ui/warm-page-container";
import { Building2, MapPin, Phone, Mail } from "lucide-react";
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export default function Agency() {
  const { isAuthenticated } = useAuthCore();
  const { agence } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WarmPageContainer maxWidth="4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warm-orange to-warm-teal flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mon agence</h1>
            <p className="text-sm text-muted-foreground">
              Informations sur votre agence de rattachement
            </p>
          </div>
        </div>

        {/* Rattachement */}
        <WarmCard 
          icon={Building2} 
          title="Rattachement"
          description="Votre agence HelpConfort"
          accentColor="orange"
          className="border-2 border-warm-orange/20"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Agence
              </Label>
              <Input
                value={agence || ''}
                disabled
                className="bg-muted cursor-not-allowed rounded-xl"
                placeholder="Non rattaché"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                Email de l'agence
              </Label>
              <Input
                value="contact@agence.fr"
                disabled
                className="bg-muted cursor-not-allowed rounded-xl"
                placeholder="Non renseigné"
              />
            </div>
          </div>
        </WarmCard>

        {/* Coordonnées de l'agence */}
        <WarmCard 
          icon={MapPin} 
          title="Coordonnées"
          description="Informations de contact de l'agence"
          accentColor="teal"
          className="border-2 border-warm-teal/20"
        >
          <ApiToggleProvider>
            <AgencyProvider>
              <AgencyInfoCompact />
            </AgencyProvider>
          </ApiToggleProvider>
        </WarmCard>

        {/* Contact Support */}
        <WarmCard accentColor="blue" className="bg-warm-blue/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-warm-blue/10 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-warm-blue" />
            </div>
            <div>
              <h4 className="font-semibold">Besoin d'aide ?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Contactez le support HelpConfort pour toute question concernant votre agence ou votre compte.
              </p>
            </div>
          </div>
        </WarmCard>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl"
          >
            Retour
          </Button>
        </div>
      </div>
    </WarmPageContainer>
  );
}
