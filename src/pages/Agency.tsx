/**
 * Agency Page - Informations de l'agence de rattachement
 */

import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { WarmCard } from "@/components/ui/warm-card";
import { WarmPageContainer } from "@/components/ui/warm-page-container";
import { Building2, MapPin, Phone, Mail, Loader2 } from "lucide-react";
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ProfileData {
  agence: string | null; // resolved from agency_id
}

export default function Agency() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    loadProfile();
  }, [isAuthenticated, user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        // Resolve slug from agency_id
        let slug: string | null = null;
        if (data.agency_id) {
          const { data: ag } = await supabase.from('apogee_agencies').select('slug').eq('id', data.agency_id).single();
          slug = ag?.slug || null;
        }
        setProfile({ agence: slug });
      }
    } catch (error) {
      logError('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <WarmPageContainer maxWidth="4xl" className="min-h-screen">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </WarmPageContainer>
    );
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
                value={profile?.agence || ''}
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
