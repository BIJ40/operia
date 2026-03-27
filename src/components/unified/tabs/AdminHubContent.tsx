/**
 * AdminHubContent - Point d'entrée Admin avec 6 onglets principaux
 * Onglets principaux en style "Pill", sous-onglets en style "DraggableFolder"
 */

import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Settings, Building2, Brain, FileText, Database, Cpu, Users, Activity, Shield, UserPlus, StickyNote, Handshake, UserCheck, ScrollText, Eye } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';
import { usePersistedTab } from '@/hooks/usePersistedState';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

// Lazy load
const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminUserActivity = lazy(() => import('@/pages/AdminUserActivity'));
const ApporteurManagersAdminView = lazy(() => import('@/components/admin/views/ApporteurManagersAdminView'));
const PendingRegistrationsList = lazy(() => import('@/components/admin/registrations/PendingRegistrationsList'));
const ApporteurAuditLogView = lazy(() => import('@/components/admin/views/ApporteurAuditLogView'));
const AdminNotesView = lazy(() => import('@/components/admin/views/AdminNotesView'));
const SuiviClientsAdminView = lazy(() => import('@/components/admin/views/SuiviClientsAdminView'));

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
  { id: 'relations', label: 'Relations', icon: Handshake, accent: 'purple' },
  { id: 'ia', label: 'IA', icon: Brain, accent: 'green' },
  { id: 'contenu', label: 'Contenu', icon: FileText, accent: 'orange' },
  { id: 'ops', label: 'Ops', icon: Database, accent: 'pink' },
  { id: 'plateforme', label: 'Plateforme', icon: Cpu, accent: 'teal' },
];

// Sous-onglets Gestion
const GESTION_SUB_TABS: FolderTabConfig[] = [
  { id: 'users', label: 'Utilisateurs', icon: Users, accent: 'blue' },
  { id: 'inscriptions', label: 'Inscriptions', icon: UserPlus, accent: 'orange' },
  { id: 'agences', label: 'Agences', icon: Building2, accent: 'purple' },
  { id: 'modules', label: 'Droits', icon: Shield, accent: 'orange' },
  { id: 'notes', label: 'Notes', icon: StickyNote, accent: 'orange' },
  { id: 'activity', label: 'Activité', icon: Activity, accent: 'green' },
];

// Sous-onglets Relations
const RELATIONS_SUB_TABS: FolderTabConfig[] = [
  { id: 'apporteurs', label: 'Apporteurs', icon: UserCheck, accent: 'purple' },
  { id: 'audit-apporteurs', label: 'Audit Apporteurs', icon: ScrollText, accent: 'green' },
  { id: 'suivi-clients', label: 'Suivi Clients', icon: Eye, accent: 'orange' },
];

const ADMIN_MAIN_TAB_IDS = ADMIN_MAIN_TABS.map(tab => tab.id);
const DEFAULT_GESTION_ORDER = ['users', 'inscriptions', 'agences', 'modules', 'notes', 'activity'];
const DEFAULT_RELATIONS_ORDER = ['apporteurs', 'audit-apporteurs', 'suivi-clients'];

export default function AdminHubContent() {
  const { mode: navMode } = useNavigationMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [persistedMainTab, setPersistedMainTab] = usePersistedTab('admin_main_tab', 'gestion', ADMIN_MAIN_TAB_IDS);
  const workspaceTabParam = searchParams.get('tab');
  const isAdminRoute = workspaceTabParam === 'admin';
  const activeTabParam = searchParams.get('adminTab');
  const activeTab = activeTabParam && ADMIN_MAIN_TAB_IDS.includes(activeTabParam) ? activeTabParam : persistedMainTab;
  const activeSubTab = searchParams.get('adminView') || 'users';
  const [gestionTabOrder, setGestionTabOrder] = useSessionState<string[]>('admin_gestion_tab_order', DEFAULT_GESTION_ORDER);
  const [relationsTabOrder, setRelationsTabOrder] = useSessionState<string[]>('admin_relations_tab_order', DEFAULT_RELATIONS_ORDER);

  useEffect(() => {
    if (!isAdminRoute) return;
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
  }, [activeTabParam, isAdminRoute, persistedMainTab, searchParams, setSearchParams, setPersistedMainTab]);

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
    next.set('tab', 'admin');
    next.set('adminTab', activeTab);
    next.set('adminView', value);
    setSearchParams(next, { replace: true });
  };

  const handleGestionReorder = useCallback((newOrder: string[]) => {
    setGestionTabOrder(newOrder);
  }, [setGestionTabOrder]);

  const handleRelationsReorder = useCallback((newOrder: string[]) => {
    setRelationsTabOrder(newOrder);
  }, [setRelationsTabOrder]);

  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
  };

  const activeGestionTab = GESTION_SUB_TABS.find(t => t.id === activeSubTab);
  const activeGestionAccent = activeGestionTab?.accent ? accentColors[activeGestionTab.accent] : undefined;

  const activeRelationsTab = RELATIONS_SUB_TABS.find(t => t.id === activeSubTab);
  const activeRelationsAccent = activeRelationsTab?.accent ? accentColors[activeRelationsTab.accent] : undefined;

  return (
    <DomainAccentProvider accent="red">
    <div className={cn("container mx-auto max-w-app", navMode === 'header' ? 'pt-1 space-y-3' : 'py-6 space-y-6')}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <PillTabsList tabs={ADMIN_MAIN_TABS} variant={navMode === 'header' ? 'switcher' : 'pill'} />

        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {/* Gestion */}
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
                  <Suspense fallback={<LoadingFallback />}><TDRUsersPage /></Suspense>
                </TabsContent>
                <TabsContent value="inscriptions" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><PendingRegistrationsList /></Suspense>
                </TabsContent>
                <TabsContent value="agences" className="mt-0 focus-visible:outline-none">
                  <ReseauView />
                </TabsContent>
                <TabsContent value="modules" className="mt-0 focus-visible:outline-none">
                  <ModulesMasterView />
                </TabsContent>
                <TabsContent value="notes" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><AdminNotesView /></Suspense>
                </TabsContent>
                <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><AdminUserActivity /></Suspense>
                </TabsContent>
              </DraggableFolderContentContainer>
            </Tabs>
          </TabsContent>

          {/* Relations */}
          <TabsContent value="relations" className="mt-0 focus-visible:outline-none">
            <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
              <DraggableFolderTabsList 
                tabs={RELATIONS_SUB_TABS} 
                tabOrder={relationsTabOrder}
                activeTab={activeSubTab}
                onTabChange={handleSubTabChange}
                onReorder={handleRelationsReorder}
                isDraggable={true}
              />
              <DraggableFolderContentContainer accentColor={activeRelationsAccent}>
                <TabsContent value="apporteurs" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><ApporteurManagersAdminView /></Suspense>
                </TabsContent>
                <TabsContent value="audit-apporteurs" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><ApporteurAuditLogView /></Suspense>
                </TabsContent>
                <TabsContent value="suivi-clients" className="mt-0 focus-visible:outline-none">
                  <Suspense fallback={<LoadingFallback />}><SuiviClientsAdminView /></Suspense>
                </TabsContent>
              </DraggableFolderContentContainer>
            </Tabs>
          </TabsContent>

          <TabsContent value="ia" className="mt-0 focus-visible:outline-none"><IAView /></TabsContent>
          <TabsContent value="contenu" className="mt-0 focus-visible:outline-none"><ContenuView /></TabsContent>
          <TabsContent value="ops" className="mt-0 focus-visible:outline-none"><OpsView /></TabsContent>
          <TabsContent value="plateforme" className="mt-0 focus-visible:outline-none"><PlateformeView /></TabsContent>
        </motion.div>
      </Tabs>
    </div>
    </DomainAccentProvider>
  );
}
