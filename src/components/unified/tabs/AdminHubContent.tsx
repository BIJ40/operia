/**
 * AdminHubContent - Nouveau point d'entrée Admin avec 5 onglets principaux
 * Onglets principaux en style "Pill", sous-onglets en style "DraggableFolder" avec bordures colorées
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Settings, Building2, Brain, FileText, Database, Cpu, Users, Activity, Shield, Network, UserCheck, UserPlus, ScrollText, StickyNote } from 'lucide-react';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { 
  DraggableFolderTabsList, 
  DraggableFolderContentContainer,
  FolderTabConfig 
} from '@/components/ui/draggable-folder-tabs';
import {
  ReseauView,
  IAView,
  ContenuView,
  OpsView,
  PlateformeView,
  ModulesMasterView,
} from '@/components/admin/views';
import { lazy, Suspense, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';
import { usePersistedTab } from '@/hooks/usePersistedState';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

// Lazy load des composants directs
const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminUserActivity = lazy(() => import('@/pages/AdminUserActivity'));
const FranchiseurView = lazy(() => import('@/components/unified/views/FranchiseurView'));
const ApporteurManagersAdminView = lazy(() => import('@/components/admin/views/ApporteurManagersAdminView'));
const PendingRegistrationsList = lazy(() => import('@/components/admin/registrations/PendingRegistrationsList'));
const ApporteurAuditLogView = lazy(() => import('@/components/admin/views/ApporteurAuditLogView'));
const AdminNotesView = lazy(() => import('@/components/admin/views/AdminNotesView'));
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
  { id: 'franchiseur', label: 'Franchiseur', icon: Network, accent: 'purple' },
  { id: 'ia', label: 'IA', icon: Brain, accent: 'green' },
  { id: 'contenu', label: 'Contenu', icon: FileText, accent: 'orange' },
  { id: 'ops', label: 'Ops', icon: Database, accent: 'pink' },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu, accent: 'teal' },
];

// Sous-onglets pour Gestion (style Folder) - 4 onglets directs
const GESTION_SUB_TABS: FolderTabConfig[] = [
  { id: 'users', label: 'Utilisateurs', icon: Users, accent: 'blue' },
  { id: 'inscriptions', label: 'Inscriptions', icon: UserPlus, accent: 'orange' },
  { id: 'apporteurs', label: 'Apporteurs', icon: UserCheck, accent: 'orange' },
  { id: 'audit-apporteurs', label: 'Audit Apporteurs', icon: ScrollText, accent: 'green' },
  { id: 'agences', label: 'Agences', icon: Building2, accent: 'purple' },
  { id: 'modules', label: 'Droits', icon: Shield, accent: 'orange' },
  { id: 'notes', label: 'Notes', icon: StickyNote, accent: 'orange' },
  { id: 'activity', label: 'Activité', icon: Activity, accent: 'green' },
];

const ADMIN_MAIN_TAB_IDS = ADMIN_MAIN_TABS.map(tab => tab.id);
const DEFAULT_GESTION_ORDER = ['users', 'inscriptions', 'apporteurs', 'audit-apporteurs', 'agences', 'modules', 'notes', 'activity'];

export default function AdminHubContent() {
  const { mode: navMode } = useNavigationMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [persistedMainTab, setPersistedMainTab] = usePersistedTab('admin_main_tab', 'gestion', ADMIN_MAIN_TAB_IDS);
  const activeTabParam = searchParams.get('adminTab');
  const activeTab = activeTabParam && ADMIN_MAIN_TAB_IDS.includes(activeTabParam) ? activeTabParam : persistedMainTab;
  const activeSubTab = searchParams.get('adminView') || 'users';
  const [gestionTabOrder, setGestionTabOrder] = useSessionState<string[]>('admin_gestion_tab_order', DEFAULT_GESTION_ORDER);

  useEffect(() => {
    if (activeTabParam && ADMIN_MAIN_TAB_IDS.includes(activeTabParam)) {
      if (activeTabParam !== persistedMainTab) {
        setPersistedMainTab(activeTabParam);
      }
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', persistedMainTab);
    setSearchParams(next, { replace: true });
  }, [activeTabParam, persistedMainTab, searchParams, setSearchParams, setPersistedMainTab]);

  const handleTabChange = (value: string) => {
    setPersistedMainTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', value);
    next.delete('adminView');
    setSearchParams(next, { replace: true });
  };

  const handleSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('adminView', value);
    setSearchParams(next, { replace: true });
  };

  const handleGestionReorder = useCallback((newOrder: string[]) => {
    setGestionTabOrder(newOrder);
  }, [setGestionTabOrder]);

  // Trouver la couleur de l'onglet Gestion actif
  const activeGestionTab = GESTION_SUB_TABS.find(t => t.id === activeSubTab);
  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
  };
  const activeGestionAccent = activeGestionTab?.accent ? accentColors[activeGestionTab.accent] : undefined;

  return (
    <DomainAccentProvider accent="red">
    <div className={navMode === 'header' ? 'pt-1 space-y-3' : 'py-6 space-y-6'}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Main Tabs - Style Pill or Switcher */}
        <PillTabsList tabs={ADMIN_MAIN_TABS} variant={navMode === 'header' ? 'switcher' : 'pill'} />

        {/* Content Container */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {/* Gestion - avec sous-onglets style DraggableFolder */}
          <TabsContent value="gestion" className="mt-0 focus-visible:outline-none">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              <DraggableFolderTabsList 
                tabs={GESTION_SUB_TABS} 
                tabOrder={gestionTabOrder}
                activeTab={activeSubTab}
                onTabChange={handleSubTabChange}
                onReorder={handleGestionReorder}
                isDraggable={true}
              />
              
              <DraggableFolderContentContainer accentColor={activeGestionAccent}>
                <TabsContent value="users" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <TDRUsersPage />
                  </Suspense>
                </TabsContent>

                <TabsContent value="inscriptions" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <PendingRegistrationsList />
                  </Suspense>
                </TabsContent>

                <TabsContent value="apporteurs" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <ApporteurManagersAdminView />
                  </Suspense>
                </TabsContent>

                <TabsContent value="audit-apporteurs" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <ApporteurAuditLogView />
                  </Suspense>
                </TabsContent>

                <TabsContent value="agences" className="mt-0 focus-visible:outline-none">
                  <ReseauView />
                </TabsContent>

                <TabsContent value="modules" className="mt-0 focus-visible:outline-none">
                  <ModulesMasterView />
                </TabsContent>

                <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminNotesView />
                  </Suspense>
                </TabsContent>

                <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminUserActivity />
                  </Suspense>
                </TabsContent>
              </DraggableFolderContentContainer>
            </Tabs>
          </TabsContent>

          <TabsContent value="franchiseur" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <FranchiseurView embedded />
            </Suspense>
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
    </DomainAccentProvider>
  );
}
