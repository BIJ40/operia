/**
 * AgencyTabContent - Contenu de l'onglet "Mon agence"
 * Affiche les onglets Actions (défaut) et Infos
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';

type AgencySubTab = 'actions' | 'infos';

const TABS_CONFIG = [
  { id: 'actions' as const, label: 'Actions', icon: ClipboardList },
  { id: 'infos' as const, label: 'Infos', icon: Settings },
];

export default function AgencyTabContent() {
  const [activeTab, setActiveTab] = useState<AgencySubTab>('actions');

  return (
    <div className="py-6 px-2 sm:px-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgencySubTab)}>
        <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0 mb-6">
          {TABS_CONFIG.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TabsTrigger 
                  value={tab.id}
                  className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/30 px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 data-[state=active]:from-warm-blue/15 data-[state=active]:to-warm-teal/10 data-[state=active]:border-warm-blue/30 data-[state=active]:text-warm-blue data-[state=active]:shadow-md hover:border-warm-blue/20 hover:shadow-md"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              </motion.div>
            );
          })}
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
