/**
 * AgencyTabContent - Contenu de l'onglet "Mon agence"
 * Affiche les onglets Actions (défaut) et Infos
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Settings } from 'lucide-react';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

type AgencySubTab = 'actions' | 'infos';

export default function AgencyTabContent() {
  const [activeTab, setActiveTab] = useState<AgencySubTab>('actions');

  return (
    <div className="py-3 px-2 sm:px-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgencySubTab)}>
        <TabsList className="h-10 p-1 bg-muted/50 rounded-xl mb-4">
          <TabsTrigger 
            value="actions" 
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Actions
          </TabsTrigger>
          <TabsTrigger 
            value="infos" 
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Infos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-0">
          <ActionsAMenerTab />
        </TabsContent>

        <TabsContent value="infos" className="mt-0">
          <AgencyInfoCompact />
        </TabsContent>
      </Tabs>
    </div>
  );
}
