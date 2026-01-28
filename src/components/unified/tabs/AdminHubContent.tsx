/**
 * AdminHubContent - Nouveau point d'entrée Admin avec 6 onglets principaux
 * Remplace l'ancienne interface à tuiles par un workspace direct
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Building2, Brain, FileText, Database, Cpu, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AccesView,
  ReseauView,
  IAView,
  ContenuView,
  OpsView,
  PlateformeView,
} from '@/components/admin/views';

interface AdminMainTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_MAIN_TABS: AdminMainTab[] = [
  { id: 'acces', label: 'Accès', icon: Shield },
  { id: 'reseau', label: 'Réseau', icon: Building2 },
  { id: 'ia', label: 'IA', icon: Brain },
  { id: 'contenu', label: 'Contenu', icon: FileText },
  { id: 'ops', label: 'Ops', icon: Database },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu },
];

export default function AdminHubContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('adminTab') || 'acces';

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', value);
    // Reset sub-view when switching main tab
    next.delete('adminView');
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      {/* Header compact */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 pb-2"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Administration</h1>
          <p className="text-xs text-muted-foreground">Centre de contrôle HC Services</p>
        </div>
      </motion.div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex flex-wrap justify-start gap-1.5 bg-transparent h-auto p-0">
          {ADMIN_MAIN_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03, duration: 0.15 }}
              >
                <TabsTrigger
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
                    "rounded-t-2xl border-2 border-b-0 -mb-[2px]",
                    "transition-all duration-200",
                    isActive
                      ? "bg-background border-border shadow-sm z-10"
                      : "bg-muted/50 border-transparent hover:bg-muted hover:border-border/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              </motion.div>
            );
          })}
        </TabsList>

        {/* Content Container */}
        <div className="rounded-2xl border-2 border-border bg-background p-4 sm:p-6 shadow-sm">
          <TabsContent value="acces" className="mt-0 focus-visible:outline-none">
            <AccesView />
          </TabsContent>

          <TabsContent value="reseau" className="mt-0 focus-visible:outline-none">
            <ReseauView />
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
        </div>
      </Tabs>
    </div>
  );
}
