import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Users, Building2, Sliders, Shield, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
interface RoyaltyTier {
  id: string;
  from_amount: number;
  to_amount: number | null;
  percentage: number;
  tier_order: number;
}

interface RoyaltyConfig {
  id: string;
  model_name: string;
  is_active: boolean;
  valid_from: string;
  tiers: RoyaltyTier[];
}

export default function FranchiseurSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("baremes");

  // Fetch royalty configurations
  const { data: royaltyConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['franchiseur-royalty-configs'],
    queryFn: async () => {
      const { data: configs, error } = await supabase
        .from('agency_royalty_config')
        .select(`
          id,
          model_name,
          is_active,
          valid_from,
          agency_royalty_tiers (
            id,
            from_amount,
            to_amount,
            percentage,
            tier_order
          )
        `)
        .eq('agency_id', '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (configs || []).map(c => ({
        ...c,
        tiers: c.agency_royalty_tiers || []
      })) as RoyaltyConfig[];
    },
  });

  // Fetch agencies for assignment view
  const { data: agencies, isLoading: loadingAgencies } = useQuery({
    queryKey: ['franchiseur-agencies-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug')
        .eq('is_active', true)
        .order('label');

      if (error) throw error;
      return data || [];
    },
  });

  // Update royalty tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ tierId, field, value }: { tierId: string; field: string; value: number }) => {
      const { error } = await supabase
        .from('agency_royalty_tiers')
        .update({ [field]: value })
        .eq('id', tierId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchiseur-royalty-configs'] });
      toast.success("Barème mis à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const formatPercentage = (value: number) => `${value}%`;
  const formatAmount = (value: number) => new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 0 
  }).format(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Paramètres Franchiseur
        </h1>
        <p className="text-muted-foreground mt-2">
          Configuration des barèmes et assignations réseau
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="baremes" className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Barèmes Redevances</span>
            <span className="sm:hidden">Barèmes</span>
          </TabsTrigger>
          <TabsTrigger value="assignations" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Assignations</span>
            <span className="sm:hidden">Assign.</span>
          </TabsTrigger>
          <TabsTrigger value="securite" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Sécurité</span>
            <span className="sm:hidden">Sécu.</span>
          </TabsTrigger>
        </TabsList>

        {/* Barèmes Tab */}
        <TabsContent value="baremes" className="space-y-6">
          <Card className="rounded-2xl border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-helpconfort-blue" />
                Modèles de Redevances
              </CardTitle>
              <CardDescription>
                Configurez les tranches de redevances appliquées au réseau
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConfigs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : royaltyConfigs && royaltyConfigs.length > 0 ? (
                <div className="space-y-6">
                  {royaltyConfigs.map((config) => (
                    <div key={config.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{config.model_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Effectif depuis le {new Date(config.valid_from).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {config.is_active && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Actif
                          </span>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3">Tranche</th>
                              <th className="text-right py-2 px-3">De</th>
                              <th className="text-right py-2 px-3">À</th>
                              <th className="text-right py-2 px-3">Taux</th>
                            </tr>
                          </thead>
                          <tbody>
                            {config.tiers
                              .sort((a, b) => a.tier_order - b.tier_order)
                              .map((tier, index) => (
                                <tr key={tier.id} className="border-b last:border-0">
                                  <td className="py-2 px-3 font-medium">Tranche {index + 1}</td>
                                  <td className="py-2 px-3 text-right">
                                    {formatAmount(tier.from_amount)}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {tier.to_amount ? formatAmount(tier.to_amount) : "∞"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-helpconfort-blue">
                                    {formatPercentage(tier.percentage)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sliders className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun modèle de redevances configuré</p>
                  <p className="text-sm mt-2">
                    Les modèles de redevances seront affichés ici une fois créés
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignations Tab */}
        <TabsContent value="assignations" className="space-y-6">
          <Card className="rounded-2xl border-l-4 border-l-helpconfort-orange bg-gradient-to-br from-helpconfort-orange/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-helpconfort-orange" />
                Assignations Agences
              </CardTitle>
              <CardDescription>
                Gérez les assignations des animateurs et directeurs aux agences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAgencies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : agencies && agencies.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agencies.map((agency) => (
                    <div 
                      key={agency.id}
                      className="p-4 border rounded-lg hover:border-helpconfort-orange/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-helpconfort-orange/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-helpconfort-orange" />
                        </div>
                        <div>
                          <p className="font-medium">{agency.label}</p>
                          <p className="text-sm text-muted-foreground">{agency.slug}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune agence trouvée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sécurité Tab */}
        <TabsContent value="securite" className="space-y-6">
          <Card className="rounded-2xl border-l-4 border-l-red-500 bg-gradient-to-br from-red-500/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Paramètres de Sécurité
              </CardTitle>
              <CardDescription>
                Configuration avancée des accès et permissions réseau
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Auto-confirmation email</Label>
                  <p className="text-sm text-muted-foreground">
                    Les nouveaux utilisateurs n'ont pas besoin de confirmer leur email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Exiger 2FA pour les rôles N5 et supérieurs
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base">Logs d'audit détaillés</Label>
                  <p className="text-sm text-muted-foreground">
                    Enregistrer toutes les actions administratives
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
