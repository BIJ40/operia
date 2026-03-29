/**
 * SuiviClientSettingsCard — Fiche de paramétrage du portail Suivi Client
 * pour l'agence courante. Affichée dans l'onglet Relations > Suivi client.
 *
 * Permet d'activer/désactiver :
 * - Google Reviews (avec lien g.page)
 * - Stripe (paiement en ligne)
 * - Personnalisation (logo, couleur, email contact)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Save, Star, CreditCard, Globe, Mail, Palette,
  ExternalLink, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';

interface SuiviSettings {
  id: string;
  slug: string;
  name: string;
  contact_email: string;
  api_subdomain: string;
  logo_url: string | null;
  primary_color: string | null;
  stripe_enabled: boolean | null;
  google_reviews_url: string | null;
  is_active: boolean | null;
  allmysms_login: string | null;
}

export default function SuiviClientSettingsCard() {
  const { agence } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['suivi-settings', agence],
    queryFn: async () => {
      if (!agence) return null;
      const { data, error } = await supabase
        .from('agency_suivi_settings')
        .select('id, slug, name, contact_email, api_subdomain, logo_url, primary_color, stripe_enabled, google_reviews_url, is_active, allmysms_login')
        .eq('slug', agence)
        .maybeSingle();
      if (error) throw error;
      return data as SuiviSettings | null;
    },
    enabled: !!agence,
  });

  const [form, setForm] = useState({
    google_reviews_url: '',
    stripe_enabled: false,
    contact_email: '',
    primary_color: '#007ab8',
  });

  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        google_reviews_url: settings.google_reviews_url || '',
        stripe_enabled: settings.stripe_enabled ?? false,
        contact_email: settings.contact_email || '',
        primary_color: settings.primary_color || '#007ab8',
      });
      setGoogleEnabled(!!settings.google_reviews_url);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<SuiviSettings>) => {
      if (!settings) throw new Error('Pas de configuration trouvée');
      const { error } = await supabase
        .from('agency_suivi_settings')
        .update(values)
        .eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suivi-settings', agence] });
      toast.success('Paramètres sauvegardés');
    },
    onError: (err: any) => toast.error(`Erreur : ${err.message}`),
  });

  const handleSave = () => {
    updateMutation.mutate({
      google_reviews_url: googleEnabled ? form.google_reviews_url : null,
      stripe_enabled: form.stripe_enabled,
      contact_email: form.contact_email,
      primary_color: form.primary_color,
    } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Le module Suivi Client n'est pas encore activé pour votre agence.</p>
          <p className="text-sm text-muted-foreground mt-1">Contactez votre administrateur pour l'activer.</p>
        </CardContent>
      </Card>
    );
  }

  const isGoogleUrlValid = !googleEnabled || form.google_reviews_url.startsWith('https://g.page');

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Paramètres Suivi Client — {settings.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez le portail client externe de votre agence.
        </p>
      </div>

      {/* Statut */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.is_active ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">Portail {settings.is_active ? 'actif' : 'inactif'}</p>
                <p className="text-xs text-muted-foreground">
                  Slug : <code className="bg-muted px-1.5 py-0.5 rounded">{settings.slug}</code>
                  {' · '}API : <code className="bg-muted px-1.5 py-0.5 rounded">{settings.api_subdomain}</code>
                </p>
              </div>
            </div>
            <Badge variant={settings.is_active ? 'default' : 'destructive'}>
              {settings.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Google Reviews */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-base">Avis Google</CardTitle>
            </div>
            <Switch
              checked={googleEnabled}
              onCheckedChange={(checked) => {
                setGoogleEnabled(checked);
                if (!checked) setForm(f => ({ ...f, google_reviews_url: '' }));
              }}
            />
          </div>
          <CardDescription>
            Affiche un bouton "Laisser un avis" sur le portail client après la fin d'un chantier.
          </CardDescription>
        </CardHeader>
        {googleEnabled && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label htmlFor="google-url">Lien Google Reviews</Label>
              <Input
                id="google-url"
                placeholder="https://g.page/r/..."
                value={form.google_reviews_url}
                onChange={e => setForm(f => ({ ...f, google_reviews_url: e.target.value }))}
                className={!isGoogleUrlValid ? 'border-destructive' : ''}
              />
              {!isGoogleUrlValid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Le lien doit commencer par <code>https://g.page</code>
                </p>
              )}
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mt-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Pour obtenir votre lien :</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-1">
                    <li>Ouvrez <a href="https://business.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Business Profile</a></li>
                    <li>Cliquez sur « Demander des avis »</li>
                    <li>Copiez le lien court (commence par <code>https://g.page/r/...</code>)</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <CardTitle className="text-base">Paiement en ligne (Stripe)</CardTitle>
            </div>
            <Switch
              checked={form.stripe_enabled}
              onCheckedChange={(checked) => setForm(f => ({ ...f, stripe_enabled: checked }))}
            />
          </div>
          <CardDescription>
            Permet aux clients de payer leurs factures directement depuis le portail de suivi.
          </CardDescription>
        </CardHeader>
        {form.stripe_enabled && (
          <CardContent className="pt-0">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-2">
                <p className="font-medium">Configuration requise par l'administrateur :</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Créez un compte <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe</a> (ou connectez-vous)</li>
                  <li>Dans Stripe → <strong>Paramètres → Connect</strong>, activez le mode de plateforme</li>
                  <li>Transmettez votre <strong>Account ID</strong> (commence par <code>acct_</code>) à l'admin plateforme</li>
                  <li>L'admin associera votre compte Stripe à votre agence</li>
                </ol>
                <p className="mt-2">
                  <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                    Accéder au dashboard Stripe <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Contact & personnalisation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Personnalisation</CardTitle>
          </div>
          <CardDescription>Email de contact affiché sur le portail et couleur de thème.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email de contact
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              placeholder="contact@monagence.fr"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="primary-color">Couleur principale</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primary-color"
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-lg border cursor-pointer"
              />
              <Input
                value={form.primary_color}
                onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                className="w-32 font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          {settings.allmysms_login && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">SMS configuré</Badge>
                <span className="text-xs text-muted-foreground">
                  Login : {settings.allmysms_login}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !isGoogleUrlValid}
          className="gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
