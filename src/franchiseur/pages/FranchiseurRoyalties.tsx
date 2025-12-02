import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoyaltyCalculator } from '../components/RoyaltyCalculator';
import { RoyaltyConfigSection } from '../components/RoyaltyConfigSection';
import { useAgencies } from '../hooks/useAgencies';
import { Calculator, Settings } from 'lucide-react';

export default function FranchiseurRoyalties() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const { data: agencies = [], isLoading: agenciesLoading } = useAgencies();

  const selectedAgency = agencies.find(a => a.id === selectedAgencyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
          Gestion des Redevances
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcul et configuration des redevances par agence
        </p>
      </div>

      {/* Sélecteur d'agence */}
      <div className="max-w-md">
        <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Sélectionner une agence" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {agenciesLoading ? (
              <SelectItem value="loading" disabled>Chargement...</SelectItem>
            ) : (
              agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedAgencyId && (
        <Tabs defaultValue="calculator" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculateur
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <RoyaltyCalculator 
              agencyId={selectedAgencyId} 
              agencyLabel={selectedAgency?.label}
            />
          </TabsContent>

          <TabsContent value="config">
            <RoyaltyConfigSection agencyId={selectedAgencyId} />
          </TabsContent>
        </Tabs>
      )}

      {!selectedAgencyId && (
        <div className="rounded-2xl border-l-4 border-l-muted bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">
            Sélectionnez une agence pour calculer ou configurer ses redevances
          </p>
        </div>
      )}
    </div>
  );
}
