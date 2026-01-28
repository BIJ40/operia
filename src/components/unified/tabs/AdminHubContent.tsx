/**
 * AdminHubContent - Nouveau point d'entrée Admin avec 6 onglets principaux
 * Chaque onglet a sa propre couleur pastel
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Settings, Building2, Brain, FileText, Database, Cpu, Shield } from 'lucide-react';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import {
  AccesView,
  ReseauView,
  IAView,
  ContenuView,
  OpsView,
  PlateformeView,
} from '@/components/admin/views';

// Onglets principaux (Agences est maintenant sous Gestion)
const ADMIN_MAIN_TABS: PillTabConfig[] = [
  { id: 'gestion', label: 'Gestion', icon: Settings, accent: 'blue' },
  { id: 'ia', label: 'IA', icon: Brain, accent: 'green' },
  { id: 'contenu', label: 'Contenu', icon: FileText, accent: 'orange' },
  { id: 'ops', label: 'Ops', icon: Database, accent: 'pink' },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu, accent: 'teal' },
];

// Sous-onglets pour Gestion
const GESTION_SUB_TABS: PillTabConfig[] = [
  { id: 'acces', label: 'Accès', icon: Shield, accent: 'blue' },
  { id: 'agences', label: 'Agences', icon: Building2, accent: 'purple' },
];

export default function AdminHubContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('adminTab') || 'gestion';
  const activeSubTab = searchParams.get('adminView') || 'acces';

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', value);
    // Reset sub-view when switching main tab
    next.delete('adminView');
    setSearchParams(next);
  };

  const handleSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('adminView', value);
    setSearchParams(next);
  };

  return (
    <div className="py-6 space-y-4">
      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <PillTabsList tabs={ADMIN_MAIN_TABS} />

        {/* Content Container */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border-2 border-border bg-background p-4 sm:p-6 shadow-sm"
        >
          {/* Gestion - avec sous-onglets Accès et Agences */}
          <TabsContent value="gestion" className="mt-0 focus-visible:outline-none">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="space-y-4">
              <PillTabsList tabs={GESTION_SUB_TABS} />
              
              <TabsContent value="acces" className="mt-0 focus-visible:outline-none">
                <AccesView />
              </TabsContent>
              
              <TabsContent value="agences" className="mt-0 focus-visible:outline-none">
                <ReseauView />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="ia" className="mt-0 focus-visible:outline-none">
            <IAView />
          </TabsContent>

          <TabsContent value="contenu" className="mt-0 focus-visible:outline-none">
            <ContenuView />
          </TabsContent>

          <TabsContent value="ops" className="mt-0 focus-visible:outline-none">
            <OpsView />
          </TabsContent>

          <TabsContent value="plateforme" className="mt-0 focus-visible:outline-none">
            <PlateformeView />
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}