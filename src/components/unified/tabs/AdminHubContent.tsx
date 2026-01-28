/**
 * AdminHubContent - Nouveau point d'entrée Admin avec 5 onglets principaux
 * Onglets principaux en style "Folder", sous-onglets en style "Pill"
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Building2, Brain, FileText, Database, Cpu, Shield } from 'lucide-react';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { cn } from '@/lib/utils';
import {
  AccesView,
  ReseauView,
  IAView,
  ContenuView,
  OpsView,
  PlateformeView,
} from '@/components/admin/views';

// Configuration des onglets principaux (style Folder)
const ADMIN_MAIN_TABS = [
  { id: 'gestion', label: 'Gestion', icon: Settings },
  { id: 'ia', label: 'IA', icon: Brain },
  { id: 'contenu', label: 'Contenu', icon: FileText },
  { id: 'ops', label: 'Ops', icon: Database },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu },
];

// Sous-onglets pour Gestion (style Pill)
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
    next.delete('adminView');
    setSearchParams(next);
  };

  const handleSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('adminView', value);
    setSearchParams(next);
  };

  return (
    <div className="py-6 space-y-0">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Main Tabs - Style Folder */}
        <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto p-0 mb-0">
          {ADMIN_MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <TabsTrigger 
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3",
                    "rounded-t-2xl border-2 border-b-0",
                    "font-medium text-sm transition-all duration-200",
                    "relative -mb-[2px] z-10",
                    isActive 
                      ? "bg-background border-border text-foreground shadow-sm" 
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              </motion.div>
            );
          })}
        </TabsList>

        {/* Content Container */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="rounded-2xl rounded-tl-none border-2 border-border bg-background p-4 sm:p-6 shadow-sm"
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