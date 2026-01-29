/**
 * AgencyTabContent - Contenu de l'onglet "Mon agence"
 * Affiche les onglets Actions (défaut) et Infos
 */

import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ClipboardList, Settings } from 'lucide-react';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';

type AgencySubTab = 'actions' | 'infos';

const AGENCY_TABS: PillTabConfig[] = [
  { id: 'actions', label: 'Actions', icon: ClipboardList },
  { id: 'infos', label: 'Infos', icon: Settings },
];

export default function AgencyTabContent() {
  const [activeTab, setActiveTab] = useState<AgencySubTab>('actions');

  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <div className="py-6 px-2 sm:px-4 space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgencySubTab)}>
            <PillTabsList tabs={AGENCY_TABS} />

            <TabsContent value="actions" className="mt-4">
              <ActionsAMenerTab />
            </TabsContent>

            <TabsContent value="infos" className="mt-4">
              <AgencyInfoCompact />
            </TabsContent>
          </Tabs>
        </div>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
