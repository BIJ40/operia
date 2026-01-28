/**
 * AdminHubContent - Nouveau point d'entrée Admin avec 5 onglets principaux
 * Onglets principaux en style "Pill", sous-onglets en style "Folder"
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Building2, Brain, FileText, Database, Cpu, Shield, Users, Activity } from 'lucide-react';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { cn } from '@/lib/utils';
import {
  ReseauView,
  IAView,
  ContenuView,
  OpsView,
  PlateformeView,
} from '@/components/admin/views';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load des composants directs
const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminUserActivity = lazy(() => import('@/pages/AdminUserActivity'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Configuration des onglets principaux (style Pill)
const ADMIN_MAIN_TABS: PillTabConfig[] = [
  { id: 'gestion', label: 'Gestion', icon: Settings, accent: 'blue' },
  { id: 'ia', label: 'IA', icon: Brain, accent: 'green' },
  { id: 'contenu', label: 'Contenu', icon: FileText, accent: 'orange' },
  { id: 'ops', label: 'Ops', icon: Database, accent: 'pink' },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu, accent: 'teal' },
];

// Sous-onglets pour Gestion (style Folder) - 3 onglets directs
const GESTION_SUB_TABS = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'agences', label: 'Agences', icon: Building2 },
  { id: 'activity', label: 'Activité', icon: Activity },
];

export default function AdminHubContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('adminTab') || 'gestion';
  const activeSubTab = searchParams.get('adminView') || 'users';

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
    <div className="py-6 space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Main Tabs - Style Pill */}
        <PillTabsList tabs={ADMIN_MAIN_TABS} />

        {/* Content Container */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {/* Gestion - avec sous-onglets style Folder */}
          <TabsContent value="gestion" className="mt-0 focus-visible:outline-none">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              {/* Sub-Tabs - Style Folder */}
              <TabsList className="flex gap-1 bg-transparent h-auto p-0 mb-0">
                {GESTION_SUB_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeSubTab === tab.id;
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
              
              {/* Content inside Folder */}
              <div className="rounded-2xl rounded-tl-none border-2 border-border bg-background p-4 sm:p-6 shadow-sm">
                <TabsContent value="users" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <TDRUsersPage />
                  </Suspense>
                </TabsContent>
                
                <TabsContent value="agences" className="mt-0 focus-visible:outline-none">
                  <ReseauView />
                </TabsContent>

                <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminUserActivity />
                  </Suspense>
                </TabsContent>
              </div>
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