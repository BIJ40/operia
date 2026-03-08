import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, FileText, HelpCircle } from "lucide-react";
import { CommercialProfileForm } from "../components/CommercialProfileForm";
import { CommercialGenerateTab } from "../components/CommercialGenerateTab";
import { CommercialDocumentation } from "../components/CommercialDocumentation";
import { useProfile } from '@/contexts/ProfileContext';
import { useHasGlobalRole } from "@/hooks/useHasGlobalRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CommercialSupportPptx() {
  const { agencyId } = useAuth();
  const isFranchiseur = useHasGlobalRole('franchisor_user');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("config");

  // Set default agency when agencyId is available
  useEffect(() => {
    if (agencyId && !selectedAgencyId) {
      setSelectedAgencyId(agencyId);
    }
  }, [agencyId, selectedAgencyId]);

  const { data: agencies } = useQuery({
    queryKey: ['agencies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('apogee_agencies').select('id, label').order('label');
      return data || [];
    },
    enabled: isFranchiseur,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Commercial PPTX</h1>
          <p className="text-muted-foreground">
            Générez des présentations PowerPoint personnalisées par agence
          </p>
        </div>
        
        {isFranchiseur && agencies && (
          <div className="w-full sm:w-64">
            <Select value={selectedAgencyId || ''} onValueChange={setSelectedAgencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Génération</span>
          </TabsTrigger>
          <TabsTrigger value="help" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Documentation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du profil commercial</CardTitle>
              <CardDescription>
                Renseignez les informations qui seront utilisées pour générer le PowerPoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommercialProfileForm agencyId={selectedAgencyId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="mt-6">
          <CommercialGenerateTab agencyId={selectedAgencyId} />
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <CommercialDocumentation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
